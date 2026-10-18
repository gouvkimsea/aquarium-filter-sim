import type {
  EditorObject,
  Vector3D,
  ConnectionPort,
  ConnectionEdge,
  ConnectionIssue,
  GraphAnalysis,
} from '../types/editor';

// =========================================================================
// 1. ROTATION & VECTOR MATH HELPERS
// =========================================================================

/**
 * Converts degrees to radians.
 */
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Converts radians to degrees.
 */
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Applies Euler rotation (in degrees, order XYZ) to a local 3D vector.
 */
export function rotateVectorByEuler(vec: Vector3D, eulerDeg: Vector3D): Vector3D {
  const ax = degToRad(eulerDeg.x || 0);
  const ay = degToRad(eulerDeg.y || 0);
  const az = degToRad(eulerDeg.z || 0);

  // Rotate around X axis
  const cosX = Math.cos(ax);
  const sinX = Math.sin(ax);
  let y1 = vec.y * cosX - vec.z * sinX;
  let z1 = vec.y * sinX + vec.z * cosX;
  let x1 = vec.x;

  // Rotate around Y axis
  const cosY = Math.cos(ay);
  const sinY = Math.sin(ay);
  let x2 = x1 * cosY + z1 * sinY;
  let z2 = -x1 * sinY + z1 * cosY;
  let y2 = y1;

  // Rotate around Z axis
  const cosZ = Math.cos(az);
  const sinZ = Math.sin(az);
  let x3 = x2 * cosZ - y2 * sinZ;
  let y3 = x2 * sinZ + y2 * cosZ;
  let z3 = z2;

  return {
    x: parseFloat(x3.toFixed(4)),
    y: parseFloat(y3.toFixed(4)),
    z: parseFloat(z3.toFixed(4)),
  };
}

/**
 * Distance between two 3D vectors.
 */
export function vectorDistance(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// =========================================================================
// 2. COMPONENT PORT DEFINITIONS
// =========================================================================

/**
 * Computes named connection ports for any compatible filter/plumbing object.
 * Returns empty array for non-connectable objects (e.g. rocks, substrate).
 */
export function getComponentPorts(object: EditorObject): ConnectionPort[] {
  const type = object.componentType || (object.parameters?.componentType as string);
  const { dimensions } = object;
  const dimX = dimensions.x;
  const dimY = dimensions.y;
  const dimZ = dimensions.z;

  switch (type) {
    case 'submersible-pump': {
      const bodyH = dimY * 0.65;
      const bodyD = dimZ * 0.7;
      return [
        {
          id: 'suction',
          name: 'Suction Impeller Intake',
          type: 'pump-suction',
          direction: 'in',
          localOffset: { x: 0, y: -0.05, z: bodyD / 2 + 0.25 },
          normal: { x: 0, y: 0, z: 1 },
          diameterMm: 22,
        },
        {
          id: 'discharge',
          name: 'Top Discharge Outlet',
          type: 'pump-discharge',
          direction: 'out',
          localOffset: { x: 0, y: bodyH / 2 + 0.28, z: bodyD / 4 },
          normal: { x: 0, y: 1, z: 0 },
          diameterMm: 20,
        },
      ];
    }

    case 'straight-pipe': {
      const radius = Math.max(0.06, dimX / 2);
      return [
        {
          id: 'port-a',
          name: 'End A (Bottom Socket)',
          type: 'pipe',
          direction: 'bidirectional',
          localOffset: { x: 0, y: -dimY / 2, z: 0 },
          normal: { x: 0, y: -1, z: 0 },
          diameterMm: Math.round(radius * 200),
        },
        {
          id: 'port-b',
          name: 'End B (Top Socket)',
          type: 'pipe',
          direction: 'bidirectional',
          localOffset: { x: 0, y: dimY / 2, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
          diameterMm: Math.round(radius * 200),
        },
      ];
    }

    case 'elbow-pipe': {
      const armLen = Math.max(0.2, dimX * 0.45);
      return [
        {
          id: 'socket-1',
          name: 'Horizontal Socket (Port 1)',
          type: 'elbow',
          direction: 'bidirectional',
          localOffset: { x: armLen, y: 0, z: 0 },
          normal: { x: 1, y: 0, z: 0 },
          diameterMm: 20,
        },
        {
          id: 'socket-2',
          name: 'Vertical Socket (Port 2)',
          type: 'elbow',
          direction: 'bidirectional',
          localOffset: { x: 0, y: -armLen, z: 0 },
          normal: { x: 0, y: -1, z: 0 },
          diameterMm: 20,
        },
      ];
    }

    case 'flexible-hose': {
      return [
        {
          id: 'port-a',
          name: 'End A (Inlet Fitting)',
          type: 'hose',
          direction: 'bidirectional',
          localOffset: { x: 0, y: -dimY / 2, z: 0 },
          normal: { x: 0, y: -1, z: 0 },
          diameterMm: 16,
        },
        {
          id: 'port-b',
          name: 'End B (Outlet Fitting)',
          type: 'hose',
          direction: 'bidirectional',
          localOffset: { x: 0, y: dimY / 2, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
          diameterMm: 16,
        },
      ];
    }

    case 'water-inlet': {
      return [
        {
          id: 'coupling',
          name: 'Top Hose/Pipe Coupling',
          type: 'inlet',
          direction: 'out', // Outflow toward the filter/pump
          localOffset: { x: 0, y: dimY / 2, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
          diameterMm: 16,
        },
        {
          id: 'strainer',
          name: 'Submerged Strainer Basket',
          type: 'inlet',
          direction: 'in', // Inflow from aquarium water
          localOffset: { x: 0, y: -dimY / 2, z: 0 },
          normal: { x: 0, y: -1, z: 0 },
          diameterMm: 24,
        },
      ];
    }

    case 'water-outlet': {
      const flareW = dimX * 0.75;
      const stemH = dimY * 0.6;
      return [
        {
          id: 'coupling',
          name: 'Base Supply Coupling',
          type: 'outlet',
          direction: 'in', // Inflow from pump/hose into the lily pipe
          localOffset: { x: 0, y: -dimY / 2, z: 0 },
          normal: { x: 0, y: -1, z: 0 },
          diameterMm: 16,
        },
        {
          id: 'nozzle',
          name: 'Flared Return Mouth',
          type: 'outlet',
          direction: 'out', // Outflow back into aquarium
          localOffset: { x: flareW * 0.58, y: stemH * 0.5, z: 0 },
          normal: { x: 1, y: 0, z: 0 },
          diameterMm: 32,
        },
      ];
    }

    case 'filter-container': {
      // Named connection ports for the internal filter chambers:
      // Port for Chamber 1 intake and Chamber 3 return/pump compartment
      return [
        {
          id: 'intake-chamber',
          name: 'Stage 1 Intake Chamber Port',
          type: 'chamber',
          direction: 'in',
          localOffset: { x: -dimX * 0.35, y: dimY / 2 - 0.05, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
          diameterMm: 25,
        },
        {
          id: 'return-chamber',
          name: 'Stage 3 Return Chamber Port',
          type: 'chamber',
          direction: 'out',
          localOffset: { x: dimX * 0.35, y: dimY / 2 - 0.05, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
          diameterMm: 25,
        },
      ];
    }

    default:
      return [];
  }
}

/**
 * Checks whether an object has connectable plumbing ports.
 */
export function isConnectableComponent(object: EditorObject): boolean {
  return getComponentPorts(object).length > 0;
}

// =========================================================================
// 3. WORLD POSITION & NORMAL RESOLUTION
// =========================================================================

/**
 * Computes the world 3D position of a component's port taking its object
 * position and Euler rotation into account.
 */
export function getWorldPortPosition(
  object: EditorObject,
  port: ConnectionPort
): Vector3D {
  const rotatedOffset = rotateVectorByEuler(
    port.localOffset,
    object.rotation || { x: 0, y: 0, z: 0 }
  );

  return {
    x: parseFloat((object.position.x + rotatedOffset.x).toFixed(3)),
    y: parseFloat((object.position.y + rotatedOffset.y).toFixed(3)),
    z: parseFloat((object.position.z + rotatedOffset.z).toFixed(3)),
  };
}

/**
 * Computes the world 3D normal vector of a component's port.
 */
export function getWorldPortNormal(
  object: EditorObject,
  port: ConnectionPort
): Vector3D {
  return rotateVectorByEuler(port.normal, object.rotation || { x: 0, y: 0, z: 0 });
}

// =========================================================================
// 4. GRAPH VALIDATION & EDGE MANAGEMENT
// =========================================================================

/**
 * Validates a proposed connection edge between two ports.
 * Checks for self-connection, existing connections (preventing duplicate connections),
 * and flow direction compatibility.
 */
export function validateConnection(
  fromObj: EditorObject,
  fromPort: ConnectionPort,
  toObj: EditorObject,
  toPort: ConnectionPort,
  existingEdges: ConnectionEdge[]
): { valid: boolean; issue?: ConnectionIssue } {
  // 1. Self Connection: Cannot connect an object to itself
  if (fromObj.id === toObj.id) {
    return {
      valid: false,
      issue: {
        type: 'invalid-type',
        severity: 'error',
        message: 'Cannot connect a component port to itself.',
        componentId: fromObj.id,
        portId: fromPort.id,
      },
    };
  }

  // 2. Duplicate Connection Check: Is either port already connected?
  const isFromConnected = existingEdges.some(
    (e) =>
      (e.fromComponentId === fromObj.id && e.fromPortId === fromPort.id) ||
      (e.toComponentId === fromObj.id && e.toPortId === fromPort.id)
  );

  if (isFromConnected) {
    return {
      valid: false,
      issue: {
        type: 'invalid-type',
        severity: 'error',
        message: `Port "${fromPort.name}" on "${fromObj.name}" is already connected. Disconnect existing pipe first.`,
        componentId: fromObj.id,
        portId: fromPort.id,
      },
    };
  }

  const isToConnected = existingEdges.some(
    (e) =>
      (e.fromComponentId === toObj.id && e.fromPortId === toPort.id) ||
      (e.toComponentId === toObj.id && e.toPortId === toPort.id)
  );

  if (isToConnected) {
    return {
      valid: false,
      issue: {
        type: 'invalid-type',
        severity: 'error',
        message: `Port "${toPort.name}" on "${toObj.name}" is already connected.`,
        componentId: toObj.id,
        portId: toPort.id,
      },
    };
  }

  // 3. Flow Direction Compatibility:
  // Cannot connect two 'in' ports directly, or two 'out' ports directly
  if (fromPort.direction === 'in' && toPort.direction === 'in') {
    return {
      valid: false,
      issue: {
        type: 'direction-mismatch',
        severity: 'warning',
        message: `Both ports are Intake ('in') directions. Connecting two inputs causes stagnant flow.`,
        componentId: fromObj.id,
        portId: fromPort.id,
      },
    };
  }

  if (fromPort.direction === 'out' && toPort.direction === 'out') {
    return {
      valid: false,
      issue: {
        type: 'direction-mismatch',
        severity: 'warning',
        message: `Both ports are Discharge ('out') directions. Connecting two outputs causes pressure collision.`,
        componentId: fromObj.id,
        portId: fromPort.id,
      },
    };
  }

  return { valid: true };
}

/**
 * Creates a stable connection edge between two ports.
 */
export function createConnectionEdge(
  fromComponentId: string,
  fromPortId: string,
  toComponentId: string,
  toPortId: string
): ConnectionEdge {
  // Canonical sorted ID to ensure uniqueness
  const sortedEndpoints = [
    `${fromComponentId}:${fromPortId}`,
    `${toComponentId}:${toPortId}`,
  ].sort();
  const edgeId = `edge_${sortedEndpoints[0]}__${sortedEndpoints[1]}`;

  return {
    id: edgeId,
    fromComponentId,
    fromPortId,
    toComponentId,
    toPortId,
    createdAt: Date.now(),
  };
}

/**
 * Finds an edge connected to a specific object and port.
 */
export function findEdgeForPort(
  edges: ConnectionEdge[],
  componentId: string,
  portId: string
): ConnectionEdge | undefined {
  return edges.find(
    (e) =>
      (e.fromComponentId === componentId && e.fromPortId === portId) ||
      (e.toComponentId === componentId && e.toPortId === portId)
  );
}

/**
 * Returns the other end of a connection edge.
 */
export function getConnectedPartner(
  edge: ConnectionEdge,
  componentId: string,
  portId: string
): { componentId: string; portId: string } | null {
  if (edge.fromComponentId === componentId && edge.fromPortId === portId) {
    return { componentId: edge.toComponentId, portId: edge.toPortId };
  }
  if (edge.toComponentId === componentId && edge.toPortId === portId) {
    return { componentId: edge.fromComponentId, portId: edge.fromPortId };
  }
  return null;
}

/**
 * Removes all edges connected to a deleted component.
 */
export function removeEdgesForComponent(
  edges: ConnectionEdge[],
  componentId: string
): ConnectionEdge[] {
  return edges.filter(
    (e) => e.fromComponentId !== componentId && e.toComponentId !== componentId
  );
}

// =========================================================================
// 5. KINEMATIC PLUMBING SYNCHRONIZER
// =========================================================================

/**
 * Automatically calculates dynamic length, rotation, and position for straight pipes
 * and elbow joints when connected components move.
 *
 * Keeps the visual 3D plumbing and connection graph in 100% synchronization.
 */
export function updateConnectedPlumbing(
  movedObjectId: string,
  allObjects: EditorObject[],
  edges: ConnectionEdge[]
): EditorObject[] {
  const objectMap = new Map<string, EditorObject>(
    allObjects.map((o) => [o.id, { ...o }])
  );

  const movedObj = objectMap.get(movedObjectId);
  if (!movedObj) return allObjects;

  // Find all edges connected directly or indirectly to the moved object
  const relevantEdges = edges.filter(
    (e) => e.fromComponentId === movedObjectId || e.toComponentId === movedObjectId
  );

  if (relevantEdges.length === 0) return allObjects;

  relevantEdges.forEach((edge) => {
    // Determine the partner component
    const partnerInfo =
      edge.fromComponentId === movedObjectId
        ? { id: edge.toComponentId, portId: edge.toPortId, myPortId: edge.fromPortId }
        : { id: edge.fromComponentId, portId: edge.fromPortId, myPortId: edge.toPortId };

    const partnerObj = objectMap.get(partnerInfo.id);
    if (!partnerObj) return;

    // Check if the partner is a straight pipe or flexible hose that can dynamically stretch & align
    const partnerType =
      partnerObj.componentType || (partnerObj.parameters?.componentType as string);

    if (partnerType === 'straight-pipe' || partnerType === 'flexible-hose') {
      const partnerPorts = getComponentPorts(partnerObj);
      const connectedPort = partnerPorts.find((p) => p.id === partnerInfo.portId);
      const otherPort = partnerPorts.find((p) => p.id !== partnerInfo.portId);

      // Check if the other end of the pipe is also connected to something
      const otherEdge = otherPort
        ? findEdgeForPort(edges, partnerObj.id, otherPort.id)
        : undefined;

      if (otherEdge && otherPort) {
        // CASE A: Both ends of the pipe are connected to components!
        // Partner pipe spans directly between target 1 and target 2
        const otherPartnerInfo = getConnectedPartner(otherEdge, partnerObj.id, otherPort.id);
        const otherConnectedObj = otherPartnerInfo
          ? objectMap.get(otherPartnerInfo.componentId)
          : undefined;

        if (otherConnectedObj && otherPartnerInfo) {
          const myPorts = getComponentPorts(movedObj);
          const myPort = myPorts.find((p) => p.id === partnerInfo.myPortId);

          const otherTargetPorts = getComponentPorts(otherConnectedObj);
          const otherTargetPort = otherTargetPorts.find(
            (p) => p.id === otherPartnerInfo.portId
          );

          if (myPort && otherTargetPort) {
            // Get world position of both target anchor ports
            const posA = getWorldPortPosition(movedObj, myPort);
            const posB = getWorldPortPosition(otherConnectedObj, otherTargetPort);

            // Compute midpoint, length, and orientation
            const midX = (posA.x + posB.x) / 2;
            const midY = (posA.y + posB.y) / 2;
            const midZ = (posA.z + posB.z) / 2;

            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            const dz = posB.z - posA.z;
            const dist = Math.max(0.15, Math.sqrt(dx * dx + dy * dy + dz * dz));

            // Direction unit vector from A to B
            const dirX = dx / dist;
            const dirY = dy / dist;
            const dirZ = dz / dist;

            // Compute Euler angles rotating default Y-axis (0, 1, 0) to (dirX, dirY, dirZ)
            // Pitch around X: atan2(Z, Y)
            // Yaw around Y: atan2(X, Z)
            const pitchDeg = radToDeg(Math.atan2(Math.sqrt(dirX * dirX + dirZ * dirZ), dirY));
            const yawDeg = radToDeg(Math.atan2(dirX, dirZ));

            // Update pipe object
            partnerObj.position = {
              x: parseFloat(midX.toFixed(3)),
              y: parseFloat(midY.toFixed(3)),
              z: parseFloat(midZ.toFixed(3)),
            };
            partnerObj.dimensions = {
              ...partnerObj.dimensions,
              y: parseFloat(dist.toFixed(3)),
            };
            partnerObj.rotation = {
              x: parseFloat(pitchDeg.toFixed(2)),
              y: parseFloat(yawDeg.toFixed(2)),
              z: 0,
            };

            objectMap.set(partnerObj.id, partnerObj);
          }
        }
      } else if (connectedPort) {
        // CASE B: Only one end of the pipe is connected to movedObj
        // Pipe translates so its connected port stays glued to movedObj's port
        const myPorts = getComponentPorts(movedObj);
        const myPort = myPorts.find((p) => p.id === partnerInfo.myPortId);
        if (myPort) {
          const targetWorldPos = getWorldPortPosition(movedObj, myPort);
          // Local offset of the pipe's connected port rotated by pipe's current rotation
          const pipeRot = partnerObj.rotation || { x: 0, y: 0, z: 0 };
          const rotatedPipeOffset = rotateVectorByEuler(connectedPort.localOffset, pipeRot);

          partnerObj.position = {
            x: parseFloat((targetWorldPos.x - rotatedPipeOffset.x).toFixed(3)),
            y: parseFloat((targetWorldPos.y - rotatedPipeOffset.y).toFixed(3)),
            z: parseFloat((targetWorldPos.z - rotatedPipeOffset.z).toFixed(3)),
          };
          objectMap.set(partnerObj.id, partnerObj);
        }
      }
    } else if (partnerType === 'elbow-pipe') {
      // For an elbow pipe, keep its connected socket anchored to the port
      const elbowPorts = getComponentPorts(partnerObj);
      const elbowPort = elbowPorts.find((p) => p.id === partnerInfo.portId);
      const myPorts = getComponentPorts(movedObj);
      const myPort = myPorts.find((p) => p.id === partnerInfo.myPortId);

      if (elbowPort && myPort) {
        const targetWorldPos = getWorldPortPosition(movedObj, myPort);
        const elbowRot = partnerObj.rotation || { x: 0, y: 0, z: 0 };
        const rotatedSocketOffset = rotateVectorByEuler(elbowPort.localOffset, elbowRot);

        partnerObj.position = {
          x: parseFloat((targetWorldPos.x - rotatedSocketOffset.x).toFixed(3)),
          y: parseFloat((targetWorldPos.y - rotatedSocketOffset.y).toFixed(3)),
          z: parseFloat((targetWorldPos.z - rotatedSocketOffset.z).toFixed(3)),
        };
        objectMap.set(partnerObj.id, partnerObj);
      }
    }
  });

  return Array.from(objectMap.values());
}

// =========================================================================
// 6. PROXIMITY SNAPPING DETECTOR
// =========================================================================

export interface SnapTarget {
  sourceObject: EditorObject;
  sourcePort: ConnectionPort;
  targetObject: EditorObject;
  targetPort: ConnectionPort;
  distance: number;
  snappedPosition: Vector3D;
}

/**
 * Searches for nearby open compatible ports within a snap threshold (default 0.45m).
 * Enables magnetic 3D endpoint snapping.
 */
export function findNearbySnapPort(
  movingObj: EditorObject,
  allObjects: EditorObject[],
  edges: ConnectionEdge[],
  snapDistanceThreshold: number = 0.45
): SnapTarget | null {
  const sourcePorts = getComponentPorts(movingObj);
  if (sourcePorts.length === 0) return null;

  let bestSnap: SnapTarget | null = null;
  let minDistance = snapDistanceThreshold;

  for (const sourcePort of sourcePorts) {
    // Check if source port is already connected
    if (findEdgeForPort(edges, movingObj.id, sourcePort.id)) continue;

    const sourceWorldPos = getWorldPortPosition(movingObj, sourcePort);

    for (const targetObj of allObjects) {
      if (targetObj.id === movingObj.id || !targetObj.visible) continue;

      const targetPorts = getComponentPorts(targetObj);
      for (const targetPort of targetPorts) {
        // Check if target port is already connected
        if (findEdgeForPort(edges, targetObj.id, targetPort.id)) continue;

        // Check validation
        const val = validateConnection(
          movingObj,
          sourcePort,
          targetObj,
          targetPort,
          edges
        );
        if (!val.valid) continue;

        const targetWorldPos = getWorldPortPosition(targetObj, targetPort);
        const dist = vectorDistance(sourceWorldPos, targetWorldPos);

        if (dist < minDistance) {
          minDistance = dist;

          // Calculate snapped position for movingObj so sourcePort matches targetWorldPos
          const movingRot = movingObj.rotation || { x: 0, y: 0, z: 0 };
          const rotatedSourceOffset = rotateVectorByEuler(
            sourcePort.localOffset,
            movingRot
          );

          bestSnap = {
            sourceObject: movingObj,
            sourcePort,
            targetObject: targetObj,
            targetPort,
            distance: dist,
            snappedPosition: {
              x: parseFloat((targetWorldPos.x - rotatedSourceOffset.x).toFixed(3)),
              y: parseFloat((targetWorldPos.y - rotatedSourceOffset.y).toFixed(3)),
              z: parseFloat((targetWorldPos.z - rotatedSourceOffset.z).toFixed(3)),
            },
          };
        }
      }
    }
  }

  return bestSnap;
}

// =========================================================================
// 7. GRAPH TOPOLOGY & SYSTEM DIAGNOSTICS
// =========================================================================

/**
 * Performs topological graph analysis on the connected filter plumbing network.
 * Identifies open ports, missing connections, flow chains, and warnings.
 */
export function analyzeConnectionGraph(
  objects: EditorObject[],
  edges: ConnectionEdge[]
): GraphAnalysis {
  const issues: ConnectionIssue[] = [];
  let connectedPortCount = 0;
  let openPortCount = 0;

  const validObjectIds = new Set(objects.map((o) => o.id));

  // 1. Check for Orphan Edges (edge points to non-existent object)
  const validEdges: ConnectionEdge[] = [];
  edges.forEach((edge) => {
    if (!validObjectIds.has(edge.fromComponentId)) {
      issues.push({
        type: 'orphan-edge',
        severity: 'error',
        message: `Connection references missing component ID: ${edge.fromComponentId}`,
        componentId: edge.fromComponentId,
      });
      return;
    }
    if (!validObjectIds.has(edge.toComponentId)) {
      issues.push({
        type: 'orphan-edge',
        severity: 'error',
        message: `Connection references missing component ID: ${edge.toComponentId}`,
        componentId: edge.toComponentId,
      });
      return;
    }
    validEdges.push(edge);
  });

  // 2. Check each connectable component for missing / open connections
  objects.forEach((obj) => {
    const ports = getComponentPorts(obj);
    if (ports.length === 0) return;

    ports.forEach((port) => {
      const edge = findEdgeForPort(validEdges, obj.id, port.id);
      if (edge) {
        connectedPortCount++;
      } else {
        openPortCount++;

        // High priority warnings for critical components
        if (
          port.type === 'pump-discharge' ||
          port.type === 'pump-suction' ||
          (port.type === 'inlet' && port.id === 'coupling') ||
          (port.type === 'outlet' && port.id === 'coupling')
        ) {
          issues.push({
            type: 'disconnected-port',
            severity: 'warning',
            message: `Open Port: "${port.name}" on "${obj.name}" has no connected pipe. Water flow will leak or stop here.`,
            componentId: obj.id,
            portId: port.id,
          });
        }
      }
    });
  });

  // 3. Trace Flow Chains through the Adjacency Graph
  // Build adjacency graph: Node = `${objId}:${portId}`
  const adjacency = new Map<string, string[]>();
  validEdges.forEach((edge) => {
    const nodeA = `${edge.fromComponentId}:${edge.fromPortId}`;
    const nodeB = `${edge.toComponentId}:${edge.toPortId}`;

    if (!adjacency.has(nodeA)) adjacency.set(nodeA, []);
    if (!adjacency.has(nodeB)) adjacency.set(nodeB, []);

    adjacency.get(nodeA)!.push(nodeB);
    adjacency.get(nodeB)!.push(nodeA);
  });

  // Trace connected chains from known sources (inlets, filter chambers)
  const chains: string[][] = [];
  const visitedNodes = new Set<string>();

  validEdges.forEach((edge) => {
    const startNode = `${edge.fromComponentId}:${edge.fromPortId}`;
    if (visitedNodes.has(startNode)) return;

    // Traverse component chain
    const chain: string[] = [];
    const queue = [startNode];
    visitedNodes.add(startNode);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const compId = current.split(':')[0];
      if (!chain.includes(compId)) {
        chain.push(compId);
      }

      const neighbors = adjacency.get(current) || [];
      neighbors.forEach((nbr) => {
        if (!visitedNodes.has(nbr)) {
          visitedNodes.add(nbr);
          queue.push(nbr);
        }
      });
    }

    if (chain.length > 1) {
      chains.push(chain);
    }
  });

  const hasCriticalErrors = issues.some((i) => i.severity === 'error');

  return {
    isValid: !hasCriticalErrors,
    connectedEdgeCount: validEdges.length,
    openPortCount,
    connectedPortCount,
    issues,
    chains,
  };
}
