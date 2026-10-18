/**
 * Hydraulic Network Graph Tracer
 * 
 * Traverses the editor's component graph and connection edges to identify
 * suction paths, discharge paths, fittings, media beds, and parallel branch splits.
 * Explicitly flags disconnected networks, dead ends, and unsupported topologies.
 */

import type { EditorObject, ConnectionEdge, ConnectionPort } from '../../types/editor';
import { getComponentPorts, findEdgeForPort, getConnectedPartner } from '../../utils/connectionGraph';
import type { HydraulicStatus } from '../../types/hydraulic';

export interface TracedSegment {
  component: EditorObject;
  fromPort: ConnectionPort;
  toPort: ConnectionPort;
  lengthM: number;
  innerDiameterMm: number;
  isMedia: boolean;
  lossCoefficientK: number;
  elevationChangeM: number; // toPort.y - fromPort.y
}

export interface TracedBranch {
  branchIndex: number;
  name: string;
  segments: TracedSegment[];
  terminalOutlet?: EditorObject;
  isDeadEnd: boolean;
}

export interface NetworkTraceResult {
  status: HydraulicStatus;
  primaryPump?: EditorObject;
  suctionSegments: TracedSegment[];
  dischargeSegments: TracedSegment[];
  parallelBranches?: TracedBranch[];
  terminalOutlets: EditorObject[];
  allPumps: EditorObject[];
  unsolvedReasons: string[];
  warnings: string[];
}

/**
 * Extracts inner diameter in millimeters from object parameters or dimensions.
 */
export function extractInnerDiameterMm(obj: EditorObject, defaultMm: number = 20): number {
  if (obj.parameters) {
    if (typeof obj.parameters.innerDiameterMm === 'number') return obj.parameters.innerDiameterMm;
    if (typeof obj.parameters.diameterMm === 'number') return obj.parameters.diameterMm;
    if (typeof obj.parameters.pipeDiameter === 'number') return obj.parameters.pipeDiameter;
  }
  const compType = obj.componentType;
  if (compType === 'flexible-hose') return 16;
  if (compType === 'water-inlet' || compType === 'water-outlet') return 16;
  if (compType === 'straight-pipe' || compType === 'elbow-pipe') return 20;
  return defaultMm;
}

/**
 * Calculates effective physical flow length through a component in meters.
 */
export function extractComponentLengthM(obj: EditorObject): number {
  const compType = obj.componentType;
  const dims = obj.dimensions;

  switch (compType) {
    case 'straight-pipe':
      return Math.max(0.05, dims.y);
    case 'flexible-hose':
      return Math.max(0.1, dims.y);
    case 'elbow-pipe':
      // Arc length of 90 deg elbow with radius ~ dims.x * 0.4
      return Math.max(0.05, dims.x * 0.4 * (Math.PI / 2));
    case 'water-inlet':
      return Math.max(0.1, dims.y * 0.7);
    case 'water-outlet':
      return Math.max(0.1, dims.y * 0.5);
    case 'coarse-sponge':
    case 'fine-sponge':
    case 'filter-floss-pad':
      return Math.max(0.04, dims.x); // Thickness across media bed
    case 'ceramic-bio-rings':
    case 'bio-media-balls':
      return Math.max(0.05, dims.y);
    default:
      return Math.max(0.05, dims.y);
  }
}

/**
 * Determines the corresponding exit port of a component given the entry port.
 */
export function getInternalExitPort(
  component: EditorObject,
  entryPortId: string
): ConnectionPort | null {
  const ports = getComponentPorts(component);
  if (ports.length <= 1) return null;

  const compType = component.componentType;

  // Straight pipe: port-a <-> port-b
  if (compType === 'straight-pipe' || compType === 'flexible-hose') {
    return ports.find((p) => p.id !== entryPortId) || null;
  }

  // 90° elbow: socket-1 <-> socket-2
  if (compType === 'elbow-pipe') {
    return ports.find((p) => p.id !== entryPortId) || null;
  }

  // Water outlet: coupling -> nozzle
  if (compType === 'water-outlet') {
    if (entryPortId === 'coupling') {
      return ports.find((p) => p.id === 'nozzle') || null;
    }
    return null;
  }

  // Water inlet: strainer -> coupling
  if (compType === 'water-inlet') {
    if (entryPortId === 'strainer') {
      return ports.find((p) => p.id === 'coupling') || null;
    }
    return null;
  }

  // Submersible pump: suction -> discharge
  if (compType === 'submersible-pump') {
    if (entryPortId === 'suction') {
      return ports.find((p) => p.id === 'discharge') || null;
    }
    return null;
  }

  // Generic fallback: pick first different port
  return ports.find((p) => p.id !== entryPortId) || null;
}

/**
 * Traces the complete hydraulic network starting from pumps.
 */
export function traceHydraulicNetwork(
  objects: EditorObject[],
  connections: ConnectionEdge[]
): NetworkTraceResult {
  const warnings: string[] = [];
  const unsolvedReasons: string[] = [];

  const objectMap = new Map<string, EditorObject>();
  objects.forEach((o) => objectMap.set(o.id, o));

  // 1. Identify pumps
  const pumps = objects.filter(
    (o) => o.componentType === 'submersible-pump' || (o.category === 'filter' && o.parameters?.flowRateGPH)
  );

  if (pumps.length === 0) {
    return {
      status: 'no-pump',
      suctionSegments: [],
      dischargeSegments: [],
      terminalOutlets: [],
      allPumps: [],
      unsolvedReasons: ['No active water pump was found in the filter design.'],
      warnings: ['Add a Submersible Pump to calculate flow through connected plumbing.'],
    };
  }

  // Check for unsupported multi-pump mesh network
  if (pumps.length > 1) {
    unsolvedReasons.push(
      `Multiple pumps (${pumps.length}) detected. Interacting multi-pump mesh networks require full non-linear Hardy-Cross network solving and are not supported in the simplified 1D hydraulic model.`
    );
    return {
      status: 'unsolved',
      primaryPump: pumps[0],
      suctionSegments: [],
      dischargeSegments: [],
      terminalOutlets: [],
      allPumps: pumps,
      unsolvedReasons,
      warnings: ['Multiple pumps in the same connected plumbing loop cannot be solved by the simplified model.'],
    };
  }

  const primaryPump = pumps[0];
  const pumpPorts = getComponentPorts(primaryPump);
  const dischargePort = pumpPorts.find((p) => p.id === 'discharge' || p.direction === 'out');
  const suctionPort = pumpPorts.find((p) => p.id === 'suction' || p.direction === 'in');

  if (!dischargePort) {
    return {
      status: 'invalid-network',
      primaryPump,
      suctionSegments: [],
      dischargeSegments: [],
      terminalOutlets: [],
      allPumps: pumps,
      unsolvedReasons: ['Pump is missing a discharge port.'],
      warnings: [],
    };
  }

  // 2. Trace Discharge Path
  const dischargeSegments: TracedSegment[] = [];
  const terminalOutlets: EditorObject[] = [];
  let parallelBranches: TracedBranch[] | undefined = undefined;

  // Check initial discharge connection
  const dischargeEdges = connections.filter(
    (e) =>
      (e.fromComponentId === primaryPump.id && e.fromPortId === dischargePort.id) ||
      (e.toComponentId === primaryPump.id && e.toPortId === dischargePort.id)
  );

  if (dischargeEdges.length === 0) {
    return {
      status: 'disconnected',
      primaryPump,
      suctionSegments: [],
      dischargeSegments: [],
      terminalOutlets: [],
      allPumps: pumps,
      unsolvedReasons: ['Pump discharge port is not connected to any pipe, hose, or fitting.'],
      warnings: [
        `The discharge nozzle of "${primaryPump.name}" has no connected plumbing. Connect a pipe or hose to establish water return.`,
      ],
    };
  }

  // Recursive / iterative path tracer
  const visitedComponents = new Set<string>([primaryPump.id]);

  let currentComp = primaryPump;
  let currentExitPort = dischargePort;
  let isDeadEnd = false;
  let reachedTerminal = false;

  while (!reachedTerminal && !isDeadEnd) {
    // Find edge from currentComp:currentExitPort
    const connectedEdges = connections.filter((e) => {
      const match1 = e.fromComponentId === currentComp.id && e.fromPortId === currentExitPort.id;
      const match2 = e.toComponentId === currentComp.id && e.toPortId === currentExitPort.id;
      return match1 || match2;
    });

    if (connectedEdges.length === 0) {
      isDeadEnd = true;
      break;
    }

    if (connectedEdges.length > 1) {
      // Parallel branch split! Flow splits into multiple parallel paths
      parallelBranches = [];
      let allBranchesValid = true;

      let hasCycle = false;
      for (let bIdx = 0; bIdx < connectedEdges.length; bIdx++) {
        const edge = connectedEdges[bIdx];
        const partner = getConnectedPartner(edge, currentComp.id, currentExitPort.id);
        if (!partner) continue;

        const branchSegments: TracedSegment[] = [];
        let branchComp = objectMap.get(partner.componentId);
        let branchEntryPortId = partner.portId;
        let branchDeadEnd = false;
        let branchOutlet: EditorObject | undefined = undefined;
        const branchVisited = new Set<string>([primaryPump.id, currentComp.id]);

        while (branchComp && !branchDeadEnd && !branchOutlet) {
          if (branchVisited.has(branchComp.id)) {
            allBranchesValid = false;
            hasCycle = true;
            unsolvedReasons.push(`Closed plumbing loop detected at "${branchComp.name}" without an open return outlet.`);
            break;
          }
          branchVisited.add(branchComp.id);

          const branchPorts = getComponentPorts(branchComp);
          const entryPort = branchPorts.find((p) => p.id === branchEntryPortId);
          if (!entryPort) {
            branchDeadEnd = true;
            break;
          }

          if (branchComp.componentType === 'water-outlet') {
            branchOutlet = branchComp;
            terminalOutlets.push(branchComp);
            branchSegments.push({
              component: branchComp,
              fromPort: entryPort,
              toPort: branchPorts.find((p) => p.id === 'nozzle') || entryPort,
              lengthM: extractComponentLengthM(branchComp),
              innerDiameterMm: extractInnerDiameterMm(branchComp),
              isMedia: false,
              lossCoefficientK: 0.55,
              elevationChangeM: 0,
            });
            break;
          }

          const exitPort = getInternalExitPort(branchComp, branchEntryPortId);
          if (!exitPort) {
            branchDeadEnd = true;
            break;
          }

          const segLen = extractComponentLengthM(branchComp);
          const segDia = extractInnerDiameterMm(branchComp);
          const isMediaComp = branchComp.category === 'media';

          let kFactor = 0;
          if (branchComp.componentType === 'elbow-pipe') kFactor = 0.95;
          if (branchComp.componentType === 'flexible-hose') kFactor = 0.25;

          branchSegments.push({
            component: branchComp,
            fromPort: entryPort,
            toPort: exitPort,
            lengthM: segLen,
            innerDiameterMm: segDia,
            isMedia: isMediaComp,
            lossCoefficientK: kFactor,
            elevationChangeM: (branchComp.position?.y || 0) - (currentComp.position?.y || 0),
          });

          // Next edge in branch
          const nextEdge = findEdgeForPort(connections, branchComp.id, exitPort.id);
          if (!nextEdge) {
            branchDeadEnd = true;
            break;
          }

          const nextPartner = getConnectedPartner(nextEdge, branchComp.id, exitPort.id);
          if (!nextPartner) {
            branchDeadEnd = true;
            break;
          }

          branchComp = objectMap.get(nextPartner.componentId);
          branchEntryPortId = nextPartner.portId;
        }

        parallelBranches.push({
          branchIndex: bIdx,
          name: `Branch ${bIdx + 1} (${branchComp?.name || 'Path'})`,
          segments: branchSegments,
          terminalOutlet: branchOutlet,
          isDeadEnd: branchDeadEnd,
        });
      }

      if (!allBranchesValid || parallelBranches.some((b) => b.isDeadEnd)) {
        return {
          status: hasCycle ? 'invalid-network' : 'dead-end',
          primaryPump,
          suctionSegments: [],
          dischargeSegments,
          parallelBranches,
          terminalOutlets,
          allPumps: pumps,
          unsolvedReasons: hasCycle
            ? (unsolvedReasons.length > 0 ? unsolvedReasons : ['Closed plumbing loop detected without an outlet.'])
            : ['One or more parallel plumbing branches terminates in a dead end without an outlet.'],
          warnings: hasCycle
            ? ['Plumbing reconnects to itself without a return nozzle.']
            : ['Verify that all parallel pipe branches lead to an active Water Outlet.'],
        };
      }

      reachedTerminal = true;
      break;
    }

    // Single series edge
    const edge = connectedEdges[0];
    const partner = getConnectedPartner(edge, currentComp.id, currentExitPort.id);
    if (!partner) {
      isDeadEnd = true;
      break;
    }

    const nextComp = objectMap.get(partner.componentId);
    if (!nextComp) {
      isDeadEnd = true;
      break;
    }

    // Check for circular loops without outlet
    if (visitedComponents.has(nextComp.id)) {
      unsolvedReasons.push(`Closed plumbing loop detected without an open return outlet at "${nextComp.name}".`);
      return {
        status: 'invalid-network',
        primaryPump,
        suctionSegments: [],
        dischargeSegments,
        terminalOutlets,
        allPumps: pumps,
        unsolvedReasons,
        warnings: ['Plumbing reconnects to itself without a return nozzle.'],
      };
    }
    visitedComponents.add(nextComp.id);

    const partnerPorts = getComponentPorts(nextComp);
    const entryPort = partnerPorts.find((p) => p.id === partner.portId);
    if (!entryPort) {
      isDeadEnd = true;
      break;
    }

    // Check if partner is a Terminal Outlet
    if (nextComp.componentType === 'water-outlet') {
      reachedTerminal = true;
      terminalOutlets.push(nextComp);

      const nozzlePort = partnerPorts.find((p) => p.id === 'nozzle') || entryPort;
      dischargeSegments.push({
        component: nextComp,
        fromPort: entryPort,
        toPort: nozzlePort,
        lengthM: extractComponentLengthM(nextComp),
        innerDiameterMm: extractInnerDiameterMm(nextComp),
        isMedia: false,
        lossCoefficientK: 0.55,
        elevationChangeM: (nextComp.position?.y || 0) - (currentComp.position?.y || 0),
      });
      break;
    }

    const nextExitPort = getInternalExitPort(nextComp, partner.portId);
    if (!nextExitPort) {
      isDeadEnd = true;
      break;
    }

    const segLen = extractComponentLengthM(nextComp);
    const segDia = extractInnerDiameterMm(nextComp);
    const isMediaComp = nextComp.category === 'media';

    let kFactor = 0;
    if (nextComp.componentType === 'elbow-pipe') kFactor = 0.95;
    if (nextComp.componentType === 'flexible-hose') kFactor = 0.25;

    dischargeSegments.push({
      component: nextComp,
      fromPort: entryPort,
      toPort: nextExitPort,
      lengthM: segLen,
      innerDiameterMm: segDia,
      isMedia: isMediaComp,
      lossCoefficientK: kFactor,
      elevationChangeM: (nextComp.position?.y || 0) - (currentComp.position?.y || 0),
    });

    currentComp = nextComp;
    currentExitPort = nextExitPort;
  }

  if (isDeadEnd && !reachedTerminal) {
    return {
      status: 'dead-end',
      primaryPump,
      suctionSegments: [],
      dischargeSegments,
      terminalOutlets: [],
      allPumps: pumps,
      unsolvedReasons: [
        `Flow path from pump terminates at "${currentComp.name}" (port: ${currentExitPort.name}) without reaching an outlet.`,
      ],
      warnings: [
        `Unconnected port detected at "${currentComp.name}". Water flow is blocked or will spill out.`,
      ],
    };
  }

  // 3. Trace Suction Path (optional inlet upstream of pump)
  const suctionSegments: TracedSegment[] = [];
  if (suctionPort) {
    const suctionEdge = findEdgeForPort(connections, primaryPump.id, suctionPort.id);
    if (suctionEdge) {
      const suctionPartner = getConnectedPartner(suctionEdge, primaryPump.id, suctionPort.id);
      if (suctionPartner) {
        const suctionComp = objectMap.get(suctionPartner.componentId);
        if (suctionComp) {
          const sPorts = getComponentPorts(suctionComp);
          const sPort = sPorts.find((p) => p.id === suctionPartner.portId);
          if (sPort) {
            suctionSegments.push({
              component: suctionComp,
              fromPort: sPort,
              toPort: sPort,
              lengthM: extractComponentLengthM(suctionComp),
              innerDiameterMm: extractInnerDiameterMm(suctionComp),
              isMedia: suctionComp.category === 'media',
              lossCoefficientK: suctionComp.componentType === 'water-inlet' ? 1.8 : 0.5,
              elevationChangeM: 0,
            });
          }
        }
      }
    }
  }

  return {
    status: 'solved',
    primaryPump,
    suctionSegments,
    dischargeSegments,
    parallelBranches,
    terminalOutlets,
    allPumps: pumps,
    unsolvedReasons: [],
    warnings,
  };
}
