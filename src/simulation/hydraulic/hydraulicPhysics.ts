/**
 * Hydraulic Physics Engine
 * 
 * Implements fundamental 1D fluid dynamics for pipe flow, friction losses,
 * minor fitting losses, Darcy porous media resistance, centrifugal pump curves,
 * and robust operating point solvers.
 */

import type { FlowMeasurement, FlowRegime, PumpCurveModel } from '../../types/hydraulic';

// ============================================================================
// 1. PHYSICAL CONSTANTS & FLUID PROPERTIES
// ============================================================================

export const GRAVITY_DEFAULT = 9.80665; // Standard gravity m/s²
export const WATER_DENSITY_DEFAULT = 1000.0; // kg/m³
export const PVC_ROUGHNESS_DEFAULT_MM = 0.0015; // Smooth PVC/acrylic wall roughness (mm)

/**
 * Calculates kinematic viscosity of clean fresh water as a function of temperature.
 * Uses empirical Poiseuille approximation.
 * @param tempC Temperature in Celsius (typically 15°C - 35°C for aquariums)
 * @returns Kinematic viscosity in m²/s (e.g. ~1.004e-6 at 20°C, ~0.893e-6 at 25°C)
 */
export function getKinematicViscosity(tempC: number = 25): number {
  const t = Math.max(0, Math.min(60, tempC));
  // Dynamic viscosity mu in mPa.s (cP)
  const mu = 1.790 / (1 + 0.03368 * t + 0.000221 * t * t) * 1e-3;
  const rho = 1000.0 - 0.017 * Math.pow(Math.abs(t - 4), 1.7); // Approximate density
  return mu / rho;
}

// ============================================================================
// 2. UNIT CONVERSIONS & MEASUREMENT BUILDERS
// ============================================================================

export const LPH_TO_M3S = 1.0 / (3600.0 * 1000.0);
export const M3S_TO_LPH = 3600.0 * 1000.0;
export const LPH_TO_GPH = 0.264172052;
export const GPH_TO_LPH = 1.0 / LPH_TO_GPH;

export function lphToM3s(lph: number): number {
  return Math.max(0, lph) * LPH_TO_M3S;
}

export function m3sToLph(m3s: number): number {
  return Math.max(0, m3s) * M3S_TO_LPH;
}

export function lphToGph(lph: number): number {
  return Math.max(0, lph) * LPH_TO_GPH;
}

export function gphToLph(gph: number): number {
  return Math.max(0, gph) * GPH_TO_LPH;
}

export function createFlowMeasurement(m3s: number): FlowMeasurement {
  const safeM3s = Math.max(0, m3s);
  const lph = safeM3s * M3S_TO_LPH;
  const gph = lph * LPH_TO_GPH;
  return {
    m3s: parseFloat(safeM3s.toExponential(6)),
    lph: parseFloat(lph.toFixed(2)),
    gph: parseFloat(gph.toFixed(2)),
  };
}

export function createFlowMeasurementFromLph(lph: number): FlowMeasurement {
  return createFlowMeasurement(lphToM3s(lph));
}

// ============================================================================
// 3. VELOCITY, REYNOLDS NUMBER & FLOW REGIME
// ============================================================================

/**
 * Calculates mean cross-sectional flow velocity in a circular conduit.
 * v = Q / A = 4Q / (pi * D^2)
 */
export function calculateVelocity(flowM3s: number, diameterMm: number): number {
  if (flowM3s <= 0 || diameterMm <= 0) return 0;
  const diameterM = diameterMm / 1000.0;
  const areaM2 = (Math.PI * diameterM * diameterM) / 4.0;
  return flowM3s / areaM2;
}

/**
 * Computes Reynolds number: Re = (v * D) / nu
 */
export function calculateReynolds(
  velocityMs: number,
  diameterMm: number,
  kinematicViscosity: number = getKinematicViscosity(25)
): number {
  if (velocityMs <= 0 || diameterMm <= 0 || kinematicViscosity <= 0) return 0;
  const diameterM = diameterMm / 1000.0;
  return (velocityMs * diameterM) / kinematicViscosity;
}

/**
 * Classifies flow regime based on Reynolds number.
 */
export function getFlowRegime(reynolds: number): FlowRegime {
  if (reynolds < 2000) return 'laminar';
  if (reynolds < 4000) return 'transitional';
  return 'turbulent';
}

// ============================================================================
// 4. DARCY FRICTION FACTOR (Swamee-Jain / Colebrook)
// ============================================================================

/**
 * Computes Darcy friction factor (f) across all flow regimes.
 * Uses Swamee-Jain explicit equation for turbulent regime.
 */
export function calculateDarcyFrictionFactor(
  reynolds: number,
  diameterMm: number,
  roughnessMm: number = PVC_ROUGHNESS_DEFAULT_MM
): number {
  if (reynolds <= 0) return 0.02;

  // Laminar regime: f = 64 / Re
  if (reynolds < 2000) {
    return Math.min(0.1, 64.0 / reynolds);
  }

  const relRoughness = roughnessMm / Math.max(0.1, diameterMm);

  // Turbulent regime (Re >= 4000) - Swamee-Jain formula
  const fTurbulent = (re: number) => {
    const term = (relRoughness / 3.7) + (5.74 / Math.pow(re, 0.9));
    const log10 = Math.log10(term);
    return 0.25 / (log10 * log10);
  };

  if (reynolds >= 4000) {
    const f = fTurbulent(reynolds);
    return Math.max(0.012, Math.min(0.08, f));
  }

  // Transitional regime (2000 <= Re < 4000) - Cubic / linear interpolation
  const fLam2000 = 64.0 / 2000.0; // 0.032
  const fTurb4000 = fTurbulent(4000);
  const t = (reynolds - 2000) / 2000.0;
  return fLam2000 + t * (fTurb4000 - fLam2000);
}

// ============================================================================
// 5. MAJOR & MINOR HEAD LOSS CALCULATIONS
// ============================================================================

/**
 * Calculates Darcy-Weisbach major friction head loss:
 * h_f = f * (L / D) * (v^2 / (2 * g))
 */
export function calculateMajorHeadLoss(
  lengthM: number,
  diameterMm: number,
  velocityMs: number,
  frictionFactor: number,
  gravity: number = GRAVITY_DEFAULT
): number {
  if (lengthM <= 0 || diameterMm <= 0 || velocityMs <= 0 || gravity <= 0) return 0;
  const diameterM = diameterMm / 1000.0;
  const velocityHead = (velocityMs * velocityMs) / (2.0 * gravity);
  return frictionFactor * (lengthM / diameterM) * velocityHead;
}

/**
 * Calculates minor head loss for a fitting or valve:
 * h_m = K * (v^2 / (2 * g))
 */
export function calculateMinorHeadLoss(
  lossCoefficientK: number,
  velocityMs: number,
  gravity: number = GRAVITY_DEFAULT
): number {
  if (lossCoefficientK <= 0 || velocityMs <= 0 || gravity <= 0) return 0;
  const velocityHead = (velocityMs * velocityMs) / (2.0 * gravity);
  return lossCoefficientK * velocityHead;
}

/**
 * Standard minor loss coefficients for aquarium fittings.
 */
export const FITTING_K_FACTORS = {
  ELBOW_90_SMOOTH: 0.90,       // Standard 90-degree sweep elbow
  ELBOW_90_SHARP: 1.20,        // Sharp 90-degree miter elbow
  TEE_THROUGH: 0.35,           // Straight pass through tee
  TEE_BRANCH: 1.25,            // 90-degree branch split through tee
  INLET_STRAINER: 1.80,        // Slotted intake basket with debris mesh
  OUTLET_LILY_PIPE: 0.55,      // Hydrodynamic flared horn return nozzle
  OUTLET_DUCKBILL: 0.85,       // Flattened directional jet nozzle
  HOSE_BARB_FITTING: 0.45,     // Slip hose barb connector restriction
  COUPLING_UNION: 0.15,        // Direct slip socket union
  BALL_VALVE_OPEN: 0.20,       // Fully open ball valve
  CHECK_VALVE: 2.20,           // Spring check valve
};

// ============================================================================
// 6. POROUS MEDIA RESISTANCE (Darcy's Law for Foam & Biological Media)
// ============================================================================

export interface MediaHydraulicProperties {
  mediaType: string;
  hydraulicResistanceFactor: number; // Normalized flow resistance index
  poreSizeRating: string;
}

export const MEDIA_RESISTANCE_PROFILES: Record<string, MediaHydraulicProperties> = {
  'coarse-sponge': {
    mediaType: 'Coarse Reticulated Polyurethane Foam (20 PPI)',
    hydraulicResistanceFactor: 85.0,
    poreSizeRating: 'Large 20 PPI pores, minimal resistance',
  },
  'fine-sponge': {
    mediaType: 'Fine Polyurethane Foam (40 PPI)',
    hydraulicResistanceFactor: 240.0,
    poreSizeRating: 'Micro-pores 40 PPI, moderate resistance',
  },
  'filter-floss-pad': {
    mediaType: 'Bonded White Polyester Fiber Floss',
    hydraulicResistanceFactor: 420.0,
    poreSizeRating: 'Dense non-woven fibers, high polishing resistance',
  },
  'ceramic-bio-rings': {
    mediaType: 'Hollow Sintered Glass Ceramic Rings',
    hydraulicResistanceFactor: 65.0,
    poreSizeRating: 'Open cylindrical matrix, low resistance',
  },
  'bio-media-balls': {
    mediaType: 'Lattice Fin Polypropylene Bio-Balls',
    hydraulicResistanceFactor: 45.0,
    poreSizeRating: 'High void ratio 92%, very low resistance',
  },
};

/**
 * Calculates head loss through a porous media bed using Darcy's law:
 * Delta H_media = R_media * Q
 * @param componentType Media type key
 * @param flowM3s Flow rate in m³/s
 * @param bedThicknessM Depth of media bed along flow path
 * @param isClogged If true, media has accumulated particulate matter (+150% resistance)
 */
export function calculateMediaHeadLoss(
  componentType: string,
  flowM3s: number,
  bedThicknessM: number = 0.1,
  isClogged: boolean = false
): number {
  if (flowM3s <= 0 || bedThicknessM <= 0) return 0;
  const profile = MEDIA_RESISTANCE_PROFILES[componentType];
  const baseFactor = profile ? profile.hydraulicResistanceFactor : 100.0;
  const cloggingMultiplier = isClogged ? 2.5 : 1.0;

  // Head loss in meters: Delta H = (factor * cloggingMultiplier * thickness) * (flow in L/s) * 0.05
  const flowLps = flowM3s * 1000.0;
  return baseFactor * cloggingMultiplier * bedThicknessM * flowLps * 0.0006;
}

// ============================================================================
// 7. CENTRIFUGAL PUMP PERFORMANCE MODEL
// ============================================================================

/**
 * Standard parabolic Head-Capacity (H-Q) curve for centrifugal pumps:
 * H_pump(Q) = H_max * (1 - (Q / Q_max)^2)
 * 
 * At Q = 0: H = H_max (shut-off head)
 * At Q = Q_max: H = 0 (open discharge, zero head)
 */
export function calculatePumpHead(
  flowM3s: number,
  pump: PumpCurveModel
): number {
  const maxFlowM3s = pump.ratedMaxFlow.m3s;
  if (maxFlowM3s <= 0 || pump.ratedMaxHeadM <= 0) return 0;
  if (flowM3s >= maxFlowM3s) return 0;
  if (flowM3s <= 0) return pump.ratedMaxHeadM;

  const ratio = flowM3s / maxFlowM3s;
  return pump.ratedMaxHeadM * (1.0 - ratio * ratio);
}

// ============================================================================
// 8. ROBUST OPERATING POINT ROOT FINDER (Brent / Bisection Solver)
// ============================================================================

export type SystemHeadFunction = (flowM3s: number) => {
  totalHeadM: number;
  staticHeadM: number;
  frictionHeadM: number;
  minorHeadLossM: number;
  mediaHeadLossM: number;
};

export interface SolvedOperatingPoint {
  flowRate: FlowMeasurement;
  totalDynamicHeadM: number;
  staticHeadM: number;
  frictionHeadM: number;
  minorLossHeadM: number;
  mediaLossHeadM: number;
  pumpHeadSuppliedM: number;
  flowFraction: number; // Q_op / Q_max
  headFraction: number; // H_op / H_max
  isDeadHeaded: boolean;
}

/**
 * Finds the intersection between the pump curve and the system resistance curve.
 * Solves: F(Q) = H_pump(Q) - H_sys(Q) = 0
 * Guaranteed to converge monotonically for physical pipe networks.
 */
export function solveOperatingPoint(
  pump: PumpCurveModel,
  systemHeadFn: SystemHeadFunction
): SolvedOperatingPoint {
  const qMaxM3s = pump.ratedMaxFlow.m3s;
  const hMaxM = pump.ratedMaxHeadM;

  // 1. Check zero-flow condition (Q = 0)
  const zeroHead = systemHeadFn(0);
  const staticHeadM = zeroHead.staticHeadM;

  // If static lift exceeds pump maximum shut-off head, the pump is dead-headed (flow = 0)
  if (staticHeadM >= hMaxM) {
    return {
      flowRate: createFlowMeasurement(0),
      totalDynamicHeadM: staticHeadM,
      staticHeadM,
      frictionHeadM: 0,
      minorLossHeadM: 0,
      mediaLossHeadM: 0,
      pumpHeadSuppliedM: hMaxM,
      flowFraction: 0,
      headFraction: 1.0,
      isDeadHeaded: true,
    };
  }

  // 2. Define residual function: F(Q) = H_pump(Q) - H_sys(Q)
  const fResidual = (q: number): number => {
    const hPump = calculatePumpHead(q, pump);
    const sys = systemHeadFn(q);
    return hPump - sys.totalHeadM;
  };

  // Evaluate boundary at Q_max
  const fMax = fResidual(qMaxM3s); // 0 - H_sys(Q_max) <= 0

  let qSolM3s = 0;

  if (fMax >= 0) {
    // Zero resistance case: flow is at pump maximum rated flow
    qSolM3s = qMaxM3s;
  } else {
    // Root exists strictly between 0 and qMaxM3s. Bisection search with high tolerance.
    let low = 0;
    let high = qMaxM3s;
    const tolM3s = 1e-7; // ~0.36 L/h resolution
    const maxIter = 60;

    for (let iter = 0; iter < maxIter; iter++) {
      const mid = (low + high) / 2.0;
      const fMid = fResidual(mid);

      if (Math.abs(fMid) < 1e-5 || (high - low) / 2.0 < tolM3s) {
        qSolM3s = mid;
        break;
      }

      if (fMid > 0) {
        low = mid;
      } else {
        high = mid;
      }
      qSolM3s = mid;
    }
  }

  const finalSys = systemHeadFn(qSolM3s);
  const pumpSupplied = calculatePumpHead(qSolM3s, pump);

  return {
    flowRate: createFlowMeasurement(qSolM3s),
    totalDynamicHeadM: parseFloat(finalSys.totalHeadM.toFixed(4)),
    staticHeadM: parseFloat(finalSys.staticHeadM.toFixed(4)),
    frictionHeadM: parseFloat(finalSys.frictionHeadM.toFixed(4)),
    minorLossHeadM: parseFloat(finalSys.minorHeadLossM.toFixed(4)),
    mediaLossHeadM: parseFloat(finalSys.mediaHeadLossM.toFixed(4)),
    pumpHeadSuppliedM: parseFloat(pumpSupplied.toFixed(4)),
    flowFraction: qMaxM3s > 0 ? parseFloat((qSolM3s / qMaxM3s).toFixed(4)) : 0,
    headFraction: hMaxM > 0 ? parseFloat((pumpSupplied / hMaxM).toFixed(4)) : 0,
    isDeadHeaded: false,
  };
}

// ============================================================================
// 9. PARALLEL BRANCH SOLVER
// ============================================================================

export interface BranchResistanceFunction {
  branchIndex: number;
  computeHeadLoss: (flowM3s: number) => number;
}

/**
 * Solves flow distribution across parallel branches such that:
 * 1. Head loss across all branches is equal: H_1(Q_1) = H_2(Q_2) = ... = H_parallel
 * 2. Mass is conserved: sum(Q_i) = Q_total
 * 
 * @param totalFlowM3s Total flow entering the split junction
 * @param branches Array of branch head loss calculator functions
 * @returns Array of branch flow rates in m³/s
 */
export function solveParallelFlowDistribution(
  totalFlowM3s: number,
  branches: BranchResistanceFunction[]
): number[] {
  const n = branches.length;
  if (n === 0 || totalFlowM3s <= 0) return [];
  if (n === 1) return [totalFlowM3s];

  // For 2 branches, bisection on Q_1 in [0, totalFlowM3s] with Q_2 = totalFlowM3s - Q_1
  if (n === 2) {
    let low = 0;
    let high = totalFlowM3s;
    let q1 = totalFlowM3s / 2.0;

    for (let iter = 0; iter < 45; iter++) {
      const mid = (low + high) / 2.0;
      const q2 = totalFlowM3s - mid;

      const h1 = branches[0].computeHeadLoss(mid);
      const h2 = branches[1].computeHeadLoss(q2);
      const diff = h1 - h2;

      if (Math.abs(diff) < 1e-5) {
        q1 = mid;
        break;
      }

      // If branch 1 head loss is greater, reduce Q1 (increase Q2)
      if (diff > 0) {
        high = mid;
      } else {
        low = mid;
      }
      q1 = mid;
    }

    return [q1, totalFlowM3s - q1];
  }

  // For N > 2, iterative relaxation
  let qDist = Array(n).fill(totalFlowM3s / n);
  for (let iter = 0; iter < 30; iter++) {
    const losses = qDist.map((q, idx) => Math.max(0.001, branches[idx].computeHeadLoss(q)));
    const avgLoss = losses.reduce((a, b) => a + b, 0) / n;

    // Adjust inversely proportional to head loss
    let sumWeight = 0;
    const weights = losses.map((loss, idx) => {
      // Conductance ~ Q / loss^0.5
      const w = qDist[idx] / Math.pow(loss / avgLoss, 0.45);
      sumWeight += w;
      return w;
    });

    if (sumWeight > 0) {
      qDist = weights.map((w) => (w / sumWeight) * totalFlowM3s);
    }
  }

  return qDist;
}
