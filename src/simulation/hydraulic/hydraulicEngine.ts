/**
 * Hydraulic Simulation Engine
 * 
 * High-level orchestration for 1D aquarium hydraulic simulation.
 * Evaluates component graphs, traces flow paths, calculates friction and minor losses,
 * solves centrifugal pump operating points, and distributes parallel branch flows.
 * 
 * 100% decoupled from React UI components.
 */

import type { EditorObject, ConnectionEdge } from '../../types/editor';
import type {
  HydraulicSimulationConfig,
  HydraulicSimulationResult,
  FlowPathResult,
  SegmentHydraulics,
  ParallelBranchResult,
  PumpCurveModel,
} from '../../types/hydraulic';
import {
  lphToM3s,
  gphToLph,
  createFlowMeasurement,
  calculateVelocity,
  calculateReynolds,
  getFlowRegime,
  calculateDarcyFrictionFactor,
  calculateMajorHeadLoss,
  calculateMinorHeadLoss,
  calculateMediaHeadLoss,
  getKinematicViscosity,
  solveOperatingPoint,
  solveParallelFlowDistribution,
  GRAVITY_DEFAULT,
  PVC_ROUGHNESS_DEFAULT_MM,
} from './hydraulicPhysics';
import { traceHydraulicNetwork, type TracedSegment } from './networkTracer';

export const DEFAULT_HYDRAULIC_CONFIG: HydraulicSimulationConfig = {
  waterTemperatureC: 25,
  pipeRoughnessMm: PVC_ROUGHNESS_DEFAULT_MM,
  isOpenSump: true,
  gravityMss: GRAVITY_DEFAULT,
  enableMediaResistance: true,
  assumeCleanMedia: true,
};

/**
 * Executes a hydraulic simulation on the given component and connection graph.
 * 
 * @param objects Array of editor scene objects
 * @param connections Array of connection graph edges
 * @param userConfig Optional configuration overrides
 * @returns Comprehensive, structured simulation result
 */
export function simulateHydraulics(
  objects: EditorObject[],
  connections: ConnectionEdge[],
  userConfig?: Partial<HydraulicSimulationConfig>
): HydraulicSimulationResult {
  const config: HydraulicSimulationConfig = {
    ...DEFAULT_HYDRAULIC_CONFIG,
    ...userConfig,
  };

  const assumptions: string[] = [
    `Fluid: Incompressible fresh water at ${config.waterTemperatureC}°C (density 1000 kg/m³, kinematic viscosity ${(getKinematicViscosity(config.waterTemperatureC) * 1e6).toFixed(3)}e-6 m²/s).`,
    `Friction: Darcy-Weisbach formulation with Swamee-Jain explicit Colebrook-White friction factor (absolute roughness = ${config.pipeRoughnessMm} mm for smooth PVC/acrylic).`,
    `Pump: Centrifugal head-capacity curve approximated via parabolic model H(Q) = H_max * (1 - (Q/Q_max)^2).`,
    config.isOpenSump
      ? 'Static Head: Open sump return configuration (net static lift calculated from pump elevation to highest return nozzle).'
      : 'Static Head: Closed-loop canister siphon balanced configuration (zero net static elevation lift).',
  ];

  if (config.enableMediaResistance) {
    assumptions.push(
      config.assumeCleanMedia
        ? 'Media Resistance: Darcy porous media flow model with clean, un-clogged filtration media.'
        : 'Media Resistance: Clogged media condition modeled with +150% flow resistance penalty.'
    );
  }

  // Diagnostics counters
  const diagnostics = {
    componentCount: objects.length,
    pipeCount: objects.filter((o) => o.componentType === 'straight-pipe' || o.componentType === 'flexible-hose').length,
    elbowCount: objects.filter((o) => o.componentType === 'elbow-pipe').length,
    pumpCount: objects.filter((o) => o.componentType === 'submersible-pump').length,
    inletCount: objects.filter((o) => o.componentType === 'water-inlet').length,
    outletCount: objects.filter((o) => o.componentType === 'water-outlet').length,
    mediaCount: objects.filter((o) => o.category === 'media').length,
    totalSystemLengthM: 0,
  };

  // 1. Trace Network Graph
  const trace = traceHydraulicNetwork(objects, connections);

  // Handle immediate non-operational states
  if (trace.status !== 'solved' || !trace.primaryPump) {
    return {
      status: trace.status,
      isEstimate: true,
      paths: [],
      warnings: trace.warnings,
      assumptions,
      unsolvedReasons: trace.unsolvedReasons,
      diagnostics,
    };
  }

  const pumpObj = trace.primaryPump;
  const warnings: string[] = [...trace.warnings];

  // 2. Extract Pump Curve Parameters
  let ratedLph = 950; // Default ~250 GPH
  if (pumpObj.parameters) {
    if (typeof pumpObj.parameters.flowRateGPH === 'number') {
      ratedLph = gphToLph(pumpObj.parameters.flowRateGPH);
    } else if (typeof pumpObj.parameters.flowRate === 'number') {
      ratedLph = pumpObj.parameters.flowRate;
    }
  }

  let ratedHeadM = 1.5; // Default ~4.9 ft
  if (pumpObj.parameters) {
    if (typeof pumpObj.parameters.maxHeadFeet === 'number') {
      ratedHeadM = pumpObj.parameters.maxHeadFeet * 0.3048;
    } else if (typeof pumpObj.parameters.headHeight === 'number') {
      ratedHeadM = pumpObj.parameters.headHeight;
    }
  }

  const pumpCurve: PumpCurveModel = {
    pumpId: pumpObj.id,
    pumpName: pumpObj.name,
    ratedMaxFlow: createFlowMeasurement(lphToM3s(ratedLph)),
    ratedMaxHeadM: parseFloat(ratedHeadM.toFixed(3)),
    wattage: typeof pumpObj.parameters?.wattage === 'number' ? pumpObj.parameters.wattage : 18,
    isNominalCurve: true,
  };

  // 3. Calculate Static Head (Elevation Lift)
  let staticHeadM = 0;
  if (config.isOpenSump && trace.terminalOutlets.length > 0) {
    const pumpY = pumpObj.position?.y || 0;
    const maxOutletY = Math.max(...trace.terminalOutlets.map((o) => o.position?.y || 0));
    staticHeadM = Math.max(0, maxOutletY - pumpY);
  }

  // Calculate total system physical length
  const allSeriesSegments = [...trace.suctionSegments, ...trace.dischargeSegments];
  diagnostics.totalSystemLengthM = parseFloat(
    allSeriesSegments.reduce((acc, seg) => acc + seg.lengthM, 0).toFixed(3)
  );

  const nu = getKinematicViscosity(config.waterTemperatureC);

  // 4. Construct System Head Function H_sys(Q)
  const computeSegmentLosses = (seg: TracedSegment, qM3s: number) => {
    if (qM3s <= 0) {
      return { frictionLoss: 0, minorLoss: 0, mediaLoss: 0, velocity: 0, re: 0, f: 0 };
    }
    const vel = calculateVelocity(qM3s, seg.innerDiameterMm);
    const re = calculateReynolds(vel, seg.innerDiameterMm, nu);
    const f = calculateDarcyFrictionFactor(re, seg.innerDiameterMm, config.pipeRoughnessMm);
    const frictionLoss = calculateMajorHeadLoss(seg.lengthM, seg.innerDiameterMm, vel, f, config.gravityMss);
    const minorLoss = calculateMinorHeadLoss(seg.lossCoefficientK, vel, config.gravityMss);
    const mediaLoss = seg.isMedia && config.enableMediaResistance
      ? calculateMediaHeadLoss(seg.component.componentType || '', qM3s, seg.lengthM, !config.assumeCleanMedia)
      : 0;

    return { frictionLoss, minorLoss, mediaLoss, velocity: vel, re, f };
  };

  const systemHeadFn = (qM3s: number) => {
    let frictionHeadM = 0;
    let minorHeadLossM = 0;
    let mediaHeadLossM = 0;

    // Series segments
    for (const seg of allSeriesSegments) {
      const res = computeSegmentLosses(seg, qM3s);
      frictionHeadM += res.frictionLoss;
      minorHeadLossM += res.minorLoss;
      mediaHeadLossM += res.mediaLoss;
    }

    // Parallel branches (if any)
    if (trace.parallelBranches && trace.parallelBranches.length > 0) {
      const branchCalculators = trace.parallelBranches.map((branch, bIdx) => ({
        branchIndex: bIdx,
        computeHeadLoss: (qBranch: number) => {
          let bLoss = 0;
          for (const seg of branch.segments) {
            const r = computeSegmentLosses(seg, qBranch);
            bLoss += r.frictionLoss + r.minorLoss + r.mediaLoss;
          }
          return bLoss;
        },
      }));

      const branchFlows = solveParallelFlowDistribution(qM3s, branchCalculators);
      // Parallel split head loss equals the balanced loss of any branch
      if (branchFlows.length > 0) {
        const branchHead = branchCalculators[0].computeHeadLoss(branchFlows[0]);
        minorHeadLossM += branchHead;
      }
    }

    const totalHeadM = staticHeadM + frictionHeadM + minorHeadLossM + mediaHeadLossM;
    return {
      totalHeadM,
      staticHeadM,
      frictionHeadM,
      minorHeadLossM,
      mediaHeadLossM,
    };
  };

  // 5. Solve Operating Point
  const opPoint = solveOperatingPoint(pumpCurve, systemHeadFn);

  if (opPoint.isDeadHeaded) {
    warnings.push(
      `Static elevation lift (${staticHeadM.toFixed(2)} m) equals or exceeds pump shut-off head (${pumpCurve.ratedMaxHeadM.toFixed(2)} m). Flow rate is 0 L/h.`
    );
    return {
      status: 'pump-dead-headed',
      isEstimate: true,
      operatingPoint: {
        flowRate: opPoint.flowRate,
        totalDynamicHeadM: opPoint.totalDynamicHeadM,
        staticHeadM: opPoint.staticHeadM,
        frictionHeadM: 0,
        minorLossHeadM: 0,
        mediaLossHeadM: 0,
        pumpHeadSuppliedM: opPoint.pumpHeadSuppliedM,
      },
      pumpCurve: {
        ...pumpCurve,
        operatingFlowFraction: 0,
        operatingHeadFraction: 1.0,
      },
      paths: [],
      warnings,
      assumptions,
      diagnostics,
    };
  }

  const qSolvedM3s = opPoint.flowRate.m3s;

  // 6. Build Detailed Path Segments at Operating Point
  const buildHydraulicSegments = (segments: TracedSegment[], qFlow: number): SegmentHydraulics[] => {
    return segments.map((seg) => {
      const { frictionLoss, minorLoss, mediaLoss, velocity, re, f } = computeSegmentLosses(seg, qFlow);
      const totalLoss = frictionLoss + minorLoss + mediaLoss;
      const regime = getFlowRegime(re);

      if (velocity > 2.5) {
        warnings.push(
          `High velocity (${velocity.toFixed(2)} m/s) in "${seg.component.name}". Recommend increasing pipe diameter to >= 25mm to reduce turbulence and acoustic hum.`
        );
      }

      return {
        componentId: seg.component.id,
        componentName: seg.component.name,
        componentType: seg.component.componentType || 'generic',
        fromPortId: seg.fromPort.id,
        toPortId: seg.toPort.id,
        lengthM: parseFloat(seg.lengthM.toFixed(3)),
        innerDiameterMm: seg.innerDiameterMm,
        velocityMs: parseFloat(velocity.toFixed(2)),
        reynoldsNumber: Math.round(re),
        flowRegime: regime,
        frictionFactor: parseFloat(f.toFixed(4)),
        lossCoefficientK: seg.lossCoefficientK,
        frictionHeadLossM: parseFloat(frictionLoss.toFixed(4)),
        minorHeadLossM: parseFloat(minorLoss.toFixed(4)),
        mediaHeadLossM: parseFloat(mediaLoss.toFixed(4)),
        totalHeadLossM: parseFloat(totalLoss.toFixed(4)),
        elevationChangeM: parseFloat(seg.elevationChangeM.toFixed(3)),
        isMedia: seg.isMedia,
        resistanceNote: seg.isMedia ? 'Darcy porous media resistance applied' : undefined,
      };
    });
  };

  const detailedDischargeSegments = buildHydraulicSegments(trace.dischargeSegments, qSolvedM3s);
  const detailedSuctionSegments = buildHydraulicSegments(trace.suctionSegments, qSolvedM3s);

  const paths: FlowPathResult[] = [];

  if (detailedSuctionSegments.length > 0) {
    paths.push({
      pathId: 'path_suction',
      type: 'suction',
      startComponentId: detailedSuctionSegments[0].componentId,
      endComponentId: pumpObj.id,
      segments: detailedSuctionSegments,
      totalLengthM: parseFloat(detailedSuctionSegments.reduce((a, s) => a + s.lengthM, 0).toFixed(3)),
      totalFrictionHeadM: parseFloat(detailedSuctionSegments.reduce((a, s) => a + s.frictionHeadLossM, 0).toFixed(4)),
      totalMinorLossHeadM: parseFloat(detailedSuctionSegments.reduce((a, s) => a + s.minorHeadLossM, 0).toFixed(4)),
      totalMediaLossHeadM: parseFloat(detailedSuctionSegments.reduce((a, s) => a + s.mediaHeadLossM, 0).toFixed(4)),
      totalStaticHeadM: 0,
      totalDynamicHeadM: parseFloat(detailedSuctionSegments.reduce((a, s) => a + s.totalHeadLossM, 0).toFixed(4)),
    });
  }

  paths.push({
    pathId: 'path_discharge_main',
    type: 'discharge',
    startComponentId: pumpObj.id,
    endComponentId: trace.terminalOutlets[0]?.id || 'outlet',
    segments: detailedDischargeSegments,
    totalLengthM: parseFloat(detailedDischargeSegments.reduce((a, s) => a + s.lengthM, 0).toFixed(3)),
    totalFrictionHeadM: parseFloat(detailedDischargeSegments.reduce((a, s) => a + s.frictionHeadLossM, 0).toFixed(4)),
    totalMinorLossHeadM: parseFloat(detailedDischargeSegments.reduce((a, s) => a + s.minorHeadLossM, 0).toFixed(4)),
    totalMediaLossHeadM: parseFloat(detailedDischargeSegments.reduce((a, s) => a + s.mediaHeadLossM, 0).toFixed(4)),
    totalStaticHeadM: staticHeadM,
    totalDynamicHeadM: opPoint.totalDynamicHeadM,
  });

  // 7. Solve Parallel Branches (if any)
  let solvedBranches: ParallelBranchResult[] | undefined = undefined;
  if (trace.parallelBranches && trace.parallelBranches.length > 0) {
    const branchCalculators = trace.parallelBranches.map((b, idx) => ({
      branchIndex: idx,
      computeHeadLoss: (qB: number) => {
        let bLoss = 0;
        for (const seg of b.segments) {
          const r = computeSegmentLosses(seg, qB);
          bLoss += r.frictionLoss + r.minorLoss + r.mediaLoss;
        }
        return bLoss;
      },
    }));

    const branchFlows = solveParallelFlowDistribution(qSolvedM3s, branchCalculators);
    solvedBranches = trace.parallelBranches.map((b, idx) => {
      const qBranch = branchFlows[idx] || (qSolvedM3s / trace.parallelBranches!.length);
      const bSegments = buildHydraulicSegments(b.segments, qBranch);
      const bHeadLoss = bSegments.reduce((acc, s) => acc + s.totalHeadLossM, 0);

      return {
        branchIndex: idx,
        branchName: b.name,
        segments: bSegments,
        flowRate: createFlowMeasurement(qBranch),
        flowFraction: qSolvedM3s > 0 ? parseFloat((qBranch / qSolvedM3s).toFixed(4)) : 0,
        headLossM: parseFloat(bHeadLoss.toFixed(4)),
        outletComponentId: b.terminalOutlet?.id,
      };
    });
  }

  // Deduplicate warnings
  const uniqueWarnings = Array.from(new Set(warnings));

  return {
    status: 'estimated', // Explicitly labeled as an illustrative estimate based on nominal pump curve
    isEstimate: true,
    operatingPoint: {
      flowRate: opPoint.flowRate,
      totalDynamicHeadM: opPoint.totalDynamicHeadM,
      staticHeadM: opPoint.staticHeadM,
      frictionHeadM: opPoint.frictionHeadM,
      minorLossHeadM: opPoint.minorLossHeadM,
      mediaLossHeadM: opPoint.mediaLossHeadM,
      pumpHeadSuppliedM: opPoint.pumpHeadSuppliedM,
    },
    pumpCurve: {
      ...pumpCurve,
      operatingFlowFraction: opPoint.flowFraction,
      operatingHeadFraction: opPoint.headFraction,
    },
    paths,
    parallelBranches: solvedBranches,
    warnings: uniqueWarnings,
    assumptions,
    diagnostics,
  };
}
