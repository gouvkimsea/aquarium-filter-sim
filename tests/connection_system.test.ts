import assert from 'node:assert';
import {
  getComponentPorts,
  isConnectableComponent,
  getWorldPortPosition,
  getWorldPortNormal,
  validateConnection,
  createConnectionEdge,
  findEdgeForPort,
  getConnectedPartner,
  removeEdgesForComponent,
  updateConnectedPlumbing,
  findNearbySnapPort,
  analyzeConnectionGraph,
} from '../src/utils/connectionGraph';
import type { EditorObject, ConnectionEdge, Vector3D } from '../src/types/editor';

console.log('================================================================');
console.log('      AQUARIUM FILTER SIMULATOR: CONNECTION SYSTEM TESTS        ');
console.log('================================================================\n');

let passCount = 0;
function test(description: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${description}`);
    passCount++;
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${description}`);
    console.error(`    Error: ${err?.message || err}`);
    throw err;
  }
}

// Helper to create test objects matching EditorObject schema
function createTestObject(
  id: string,
  componentType: any,
  name: string,
  pos: Vector3D = { x: 0, y: 0, z: 0 },
  rot: Vector3D = { x: 0, y: 0, z: 0 },
  dims: Vector3D = { x: 0.1, y: 0.1, z: 0.1 }
): EditorObject {
  return {
    id,
    name,
    category: 'plumbing',
    componentType,
    position: pos,
    rotation: rot,
    dimensions: dims,
    visible: true,
    locked: false,
    material: {
      color: '#00ffff',
      opacity: 1,
      roughness: 0.5,
      metalness: 0.1,
      wireframe: false,
      transparent: false,
    },
    parameters: {},
  };
}

// -----------------------------------------------------------------------------
// SUITE 1: Named Connection Ports for Compatible Components
// -----------------------------------------------------------------------------
console.log('--- SUITE 1: Named Connection Ports for Compatible Components ---');

test('Pumps have named suction inlet and discharge outlet ports with correct directions', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Eheim CompactON', { x: 0, y: 0, z: 0 });
  const ports = getComponentPorts(pump);
  assert.strictEqual(ports.length, 2, 'Pump should have exactly 2 ports');
  
  const discharge = ports.find((p) => p.id === 'discharge');
  assert.ok(discharge, 'Must have named port "discharge"');
  assert.strictEqual(discharge.direction, 'out', 'Discharge port direction must be "out"');
  assert.ok(discharge.name.includes('Discharge'));

  const suction = ports.find((p) => p.id === 'suction');
  assert.ok(suction, 'Must have named port "suction"');
  assert.strictEqual(suction.direction, 'in', 'Suction port direction must be "in"');
  assert.ok(suction.name.includes('Suction'));
});

test('Straight pipe and flexible hose have named start and end bidirectional ports', () => {
  const pipe = createTestObject('pipe-1', 'straight-pipe', 'Rigid PVC Pipe', { x: 0, y: 0, z: 0 });
  const pipePorts = getComponentPorts(pipe);
  assert.strictEqual(pipePorts.length, 2);
  assert.ok(pipePorts.some((p) => p.id === 'port-a' && p.direction === 'bidirectional'));
  assert.ok(pipePorts.some((p) => p.id === 'port-b' && p.direction === 'bidirectional'));

  const hose = createTestObject('hose-1', 'flexible-hose', 'Vinyl Hose', { x: 0, y: 0, z: 0 });
  const hosePorts = getComponentPorts(hose);
  assert.strictEqual(hosePorts.length, 2);
  assert.ok(hosePorts.some((p) => p.id === 'port-a'));
  assert.ok(hosePorts.some((p) => p.id === 'port-b'));
});

test('Elbow pipe has orthogonal sockets', () => {
  const elbow = createTestObject('elbow-1', 'elbow-pipe', '90° PVC Elbow', { x: 0, y: 0, z: 0 });
  const ports = getComponentPorts(elbow);
  assert.strictEqual(ports.length, 2);
  
  const s1 = ports.find((p) => p.id === 'socket-1');
  const s2 = ports.find((p) => p.id === 'socket-2');
  assert.ok(s1 && s1.direction === 'bidirectional');
  assert.ok(s2 && s2.direction === 'bidirectional');
});

test('Water inlet and outlet accessories have correctly oriented ports', () => {
  const inlet = createTestObject('inlet-1', 'water-inlet', 'Lily Pipe Inlet');
  const inletPorts = getComponentPorts(inlet);
  assert.strictEqual(inletPorts.length, 2);
  assert.ok(inletPorts.some((p) => p.id === 'coupling' && p.direction === 'out'));
  assert.ok(inletPorts.some((p) => p.id === 'strainer' && p.direction === 'in'));

  const outlet = createTestObject('outlet-1', 'water-outlet', 'Flare Nozzle Outlet');
  const outletPorts = getComponentPorts(outlet);
  assert.strictEqual(outletPorts.length, 2);
  assert.ok(outletPorts.some((p) => p.id === 'coupling' && p.direction === 'in'));
  assert.ok(outletPorts.some((p) => p.id === 'nozzle' && p.direction === 'out'));
});

test('Filter container provides chamber connection ports', () => {
  const container = createTestObject('container-1', 'filter-container', 'Sump Filter Box', { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0.8, y: 0.4, z: 0.3 });
  const ports = getComponentPorts(container);
  assert.strictEqual(ports.length, 2);
  assert.ok(ports.some((p) => p.id === 'intake-chamber' && p.direction === 'in'));
  assert.ok(ports.some((p) => p.id === 'return-chamber' && p.direction === 'out'));
});

test('Canister filter and media components provide named ports', () => {
  const canister = createTestObject('canister-1', 'generic', 'Fluval Canister Filter');
  const canisterPorts = getComponentPorts(canister);
  assert.strictEqual(canisterPorts.length, 2);
  assert.ok(canisterPorts.some((p) => p.id === 'canister-inlet' && p.direction === 'in'));
  assert.ok(canisterPorts.some((p) => p.id === 'canister-outlet' && p.direction === 'out'));

  const sponge = createTestObject('sponge-1', 'coarse-sponge', 'Coarse Foam Pad');
  const spongePorts = getComponentPorts(sponge);
  assert.strictEqual(spongePorts.length, 2);
  assert.ok(spongePorts.some((p) => p.id === 'media-in'));
  assert.ok(spongePorts.some((p) => p.id === 'media-out'));
});

test('Non-connectable items (dividers, décor) return empty ports and false isConnectableComponent', () => {
  const divider = createTestObject('div-1', 'internal-divider', 'Acrylic Baffle');
  assert.strictEqual(isConnectableComponent(divider), false);
  assert.strictEqual(getComponentPorts(divider).length, 0);
});

// -----------------------------------------------------------------------------
// SUITE 2: Connection Graph Data Model & Port Validation
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: Connection Graph Data Model & Port Validation ---');

test('createConnectionEdge creates stable edge with unique ID and references', () => {
  const edge = createConnectionEdge('pump-1', 'discharge', 'pipe-1', 'port-a');
  assert.ok(edge.id.startsWith('edge_'), 'Edge must have unique edge ID');
  assert.strictEqual(edge.fromComponentId, 'pump-1');
  assert.strictEqual(edge.fromPortId, 'discharge');
  assert.strictEqual(edge.toComponentId, 'pipe-1');
  assert.strictEqual(edge.toPortId, 'port-a');
});

test('validateConnection allows valid OUT to IN connection', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump');
  const pumpPorts = getComponentPorts(pump);
  const pumpOut = pumpPorts.find((p) => p.id === 'discharge')!;

  const outlet = createTestObject('outlet-1', 'water-outlet', 'Outlet');
  const outletPorts = getComponentPorts(outlet);
  const outletIn = outletPorts.find((p) => p.id === 'coupling')!;

  const result = validateConnection(pump, pumpOut, outlet, outletIn, []);
  assert.strictEqual(result.valid, true, 'OUT -> IN connection must be valid');
});

test('validateConnection allows bidirectional pipe ports with OUT or IN', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump');
  const pumpOut = getComponentPorts(pump).find((p) => p.id === 'discharge')!;

  const pipe = createTestObject('pipe-1', 'straight-pipe', 'Pipe');
  const pipeStart = getComponentPorts(pipe).find((p) => p.id === 'port-a')!;

  const result1 = validateConnection(pump, pumpOut, pipe, pipeStart, []);
  assert.strictEqual(result1.valid, true, 'OUT -> BIDIRECTIONAL must be valid');

  const outlet = createTestObject('outlet-1', 'water-outlet', 'Outlet');
  const outletIn = getComponentPorts(outlet).find((p) => p.id === 'coupling')!;
  const pipeEnd = getComponentPorts(pipe).find((p) => p.id === 'port-b')!;

  const result2 = validateConnection(pipe, pipeEnd, outlet, outletIn, []);
  assert.strictEqual(result2.valid, true, 'BIDIRECTIONAL -> IN must be valid');
});

test('validateConnection prevents self-connections', () => {
  const pipe = createTestObject('pipe-1', 'straight-pipe', 'Pipe');
  const ports = getComponentPorts(pipe);
  const result = validateConnection(pipe, ports[0], pipe, ports[1], []);
  assert.strictEqual(result.valid, false);
  assert.ok(result.issue?.message.includes('itself'), 'Should reject connecting component to itself');
});

test('validateConnection rejects invalid direction pairings (IN to IN, OUT to OUT)', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump');
  const pumpOut = getComponentPorts(pump).find((p) => p.id === 'discharge')!;

  const inlet = createTestObject('inlet-1', 'water-inlet', 'Inlet');
  const inletOut = getComponentPorts(inlet).find((p) => p.id === 'coupling')!;

  // Both are "out" direction
  const resultOutToOut = validateConnection(pump, pumpOut, inlet, inletOut, []);
  assert.strictEqual(resultOutToOut.valid, false);
  assert.ok(resultOutToOut.issue?.message.includes('output'));

  const pumpIn = getComponentPorts(pump).find((p) => p.id === 'suction')!;
  const outlet = createTestObject('outlet-1', 'water-outlet', 'Outlet');
  const outletIn = getComponentPorts(outlet).find((p) => p.id === 'coupling')!;

  // Both are "in" direction
  const resultInToIn = validateConnection(pump, pumpIn, outlet, outletIn, []);
  assert.strictEqual(resultInToIn.valid, false);
  assert.ok(resultInToIn.issue?.message.includes('Intake') || resultInToIn.issue?.message.includes('input'));
});

test('validateConnection prevents accidental duplicate connections on occupied ports', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump');
  const pumpOut = getComponentPorts(pump).find((p) => p.id === 'discharge')!;

  const pipeA = createTestObject('pipe-A', 'straight-pipe', 'Pipe A');
  const pipeAStart = getComponentPorts(pipeA).find((p) => p.id === 'port-a')!;

  const existingEdges: ConnectionEdge[] = [
    createConnectionEdge('pump-1', 'discharge', 'pipe-A', 'port-a'),
  ];

  const pipeB = createTestObject('pipe-B', 'straight-pipe', 'Pipe B');
  const pipeBStart = getComponentPorts(pipeB).find((p) => p.id === 'port-a')!;

  // Attempting to connect pipe-B to already occupied pump discharge
  const result = validateConnection(pump, pumpOut, pipeB, pipeBStart, existingEdges);
  assert.strictEqual(result.valid, false);
  assert.ok(result.issue?.message.includes('already connected'));
});

// -----------------------------------------------------------------------------
// SUITE 3: Disconnection, Reconnection, and Edge Management
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: Disconnection, Reconnection, and Edge Management ---');

test('findEdgeForPort and getConnectedPartner accurately look up connection endpoints', () => {
  const edge = createConnectionEdge('pump-1', 'discharge', 'elbow-1', 'socket-1');
  const edges = [edge];

  const foundA = findEdgeForPort(edges, 'pump-1', 'discharge');
  assert.strictEqual(foundA?.id, edge.id);

  const foundB = findEdgeForPort(edges, 'elbow-1', 'socket-1');
  assert.strictEqual(foundB?.id, edge.id);

  const partnerOfPump = getConnectedPartner(edge, 'pump-1', 'discharge');
  assert.deepStrictEqual(partnerOfPump, { componentId: 'elbow-1', portId: 'socket-1' });

  const partnerOfElbow = getConnectedPartner(edge, 'elbow-1', 'socket-1');
  assert.deepStrictEqual(partnerOfElbow, { componentId: 'pump-1', portId: 'discharge' });
});

test('removeEdgesForComponent cascades edge removal on object deletion', () => {
  const edges: ConnectionEdge[] = [
    createConnectionEdge('pump-1', 'discharge', 'elbow-1', 'socket-1'),
    createConnectionEdge('elbow-1', 'socket-2', 'pipe-1', 'port-a'),
    createConnectionEdge('pipe-1', 'port-b', 'outlet-1', 'coupling'),
  ];

  // Deleting elbow-1 should remove both edges attached to it
  const remaining = removeEdgesForComponent(edges, 'elbow-1');
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].fromComponentId, 'pipe-1');
  assert.strictEqual(remaining[0].toComponentId, 'outlet-1');
});

test('Disconnecting and reconnecting restores ability to form new connection', () => {
  let edges: ConnectionEdge[] = [
    createConnectionEdge('pump-1', 'discharge', 'pipe-A', 'port-a'),
  ];

  // Disconnect pump-1
  edges = edges.filter((e) => !(e.fromComponentId === 'pump-1' && e.fromPortId === 'discharge'));
  assert.strictEqual(edges.length, 0);

  // Now connect to pipe-B
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump');
  const pumpOut = getComponentPorts(pump).find((p) => p.id === 'discharge')!;
  const pipeB = createTestObject('pipe-B', 'straight-pipe', 'Pipe B');
  const pipeBStart = getComponentPorts(pipeB).find((p) => p.id === 'port-a')!;

  const valid = validateConnection(pump, pumpOut, pipeB, pipeBStart, edges);
  assert.strictEqual(valid.valid, true);
  edges.push(createConnectionEdge('pump-1', 'discharge', 'pipe-B', 'port-a'));
  assert.strictEqual(edges.length, 1);
});

// -----------------------------------------------------------------------------
// SUITE 4: Magnetic Snapping System
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 4: Magnetic Snapping System ---');

test('findNearbySnapPort detects compatible open port within radius and computes snapped position', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump', { x: 0, y: 0, z: 0 });
  const pumpPorts = getComponentPorts(pump);
  const pumpOut = pumpPorts.find((p) => p.id === 'discharge')!;
  const pumpOutWorld = getWorldPortPosition(pump, pumpOut);

  // Place elbow so its socket-2 (pointing down -Y) is 10cm away from pump discharge (pointing +Y)
  const elbow = createTestObject(
    'elbow-1',
    'elbow-pipe',
    'Elbow',
    {
      x: pumpOutWorld.x,
      y: pumpOutWorld.y + 0.1,
      z: pumpOutWorld.z,
    }
  );

  const snapResult = findNearbySnapPort(elbow, [pump, elbow], [], 0.4);
  assert.ok(snapResult, 'Should find snap target within 0.4m threshold');
  assert.strictEqual(snapResult.targetObject.id, 'pump-1');
  assert.strictEqual(snapResult.targetPort.id, 'discharge');

  // Verify that moving elbow to snappedPosition aligns the port endpoints
  const snappedElbow = { ...elbow, position: snapResult.snappedPosition };
  const snappedPortWorld = getWorldPortPosition(snappedElbow, snapResult.sourcePort);
  const targetWorld = getWorldPortPosition(pump, snapResult.targetPort);

  const dx = Math.abs(snappedPortWorld.x - targetWorld.x);
  const dy = Math.abs(snappedPortWorld.y - targetWorld.y);
  const dz = Math.abs(snappedPortWorld.z - targetWorld.z);
  assert.ok(dx < 0.001 && dy < 0.001 && dz < 0.001, 'Snapped position must precisely align port 3D coordinates');
});

test('findNearbySnapPort ignores objects outside snap radius', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump', { x: 0, y: 0, z: 0 });
  const elbow = createTestObject('elbow-1', 'elbow-pipe', 'Elbow', { x: 5.0, y: 0, z: 0 }); // 5m away

  const snapResult = findNearbySnapPort(elbow, [pump, elbow], [], 0.4);
  assert.strictEqual(snapResult, null, 'Should return null when outside snap radius');
});

test('findNearbySnapPort ignores ports that are already occupied', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump', { x: 0, y: 0, z: 0 });
  const pipeA = createTestObject('pipe-A', 'straight-pipe', 'Pipe A', { x: 0, y: 0.1, z: 0 });
  const elbow = createTestObject('elbow-1', 'elbow-pipe', 'Elbow', { x: 0.05, y: 0.1, z: 0 });

  const edges = [
    createConnectionEdge('pump-1', 'discharge', 'pipe-A', 'port-a'),
  ];

  // discharge is occupied by pipe-A. Elbow should NOT snap to pump discharge.
  const snapResult = findNearbySnapPort(elbow, [pump, pipeA, elbow], edges, 0.5);
  if (snapResult) {
    assert.notStrictEqual(snapResult.targetPort.id, 'discharge');
  }
});

// -----------------------------------------------------------------------------
// SUITE 5: Automatic Kinematic Plumbing Synchronization
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 5: Automatic Kinematic Plumbing Synchronization ---');

test('updateConnectedPlumbing stretches and aligns straight pipe when connected component moves', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump', { x: 0, y: 0, z: 0 });
  const pumpOut = getComponentPorts(pump).find((p) => p.id === 'discharge')!;
  const pumpOutPos = getWorldPortPosition(pump, pumpOut);

  // Pipe connected to discharge at port-a, extending upward
  const pipe = createTestObject(
    'pipe-1',
    'straight-pipe',
    'Pipe',
    { x: pumpOutPos.x, y: pumpOutPos.y + 0.15, z: pumpOutPos.z },
    { x: 0, y: 0, z: 0 },
    { x: 0.02, y: 0.3, z: 0.02 }
  );

  const edges = [
    createConnectionEdge('pump-1', 'discharge', 'pipe-1', 'port-a'),
  ];

  // Move the pump by +0.5m in X and +0.2m in Y
  const movedPump = {
    ...pump,
    position: { x: pump.position.x + 0.5, y: pump.position.y + 0.2, z: pump.position.z },
  };

  const updatedObjects = updateConnectedPlumbing(movedPump, [movedPump, pipe], edges);
  const updatedPipe = updatedObjects.find((o) => o.id === 'pipe-1');
  assert.ok(updatedPipe, 'Pipe should be returned in updated objects');

  // Verify that port-a moved along with pump discharge
  const newPumpOutPos = getWorldPortPosition(movedPump, pumpOut);
  const newPipeStartPos = getWorldPortPosition(updatedPipe, getComponentPorts(updatedPipe).find((p) => p.id === 'port-a')!);
  
  const dist = Math.hypot(
    newPipeStartPos.x - newPumpOutPos.x,
    newPipeStartPos.y - newPumpOutPos.y,
    newPipeStartPos.z - newPumpOutPos.z
  );
  assert.ok(dist < 0.01, `Pipe start must snap to new pump discharge position (dist was ${dist})`);
});

test('updateConnectedPlumbing repositions connected elbow when parent moves', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump', { x: 0, y: 0, z: 0 });
  const pumpOut = getComponentPorts(pump).find((p) => p.id === 'discharge')!;
  const pumpOutPos = getWorldPortPosition(pump, pumpOut);

  const elbow = createTestObject(
    'elbow-1',
    'elbow-pipe',
    'Elbow',
    { x: pumpOutPos.x, y: pumpOutPos.y + 0.05, z: pumpOutPos.z }
  );

  const edges = [
    createConnectionEdge('pump-1', 'discharge', 'elbow-1', 'socket-2'),
  ];

  // Move pump
  const movedPump = {
    ...pump,
    position: { x: 1.0, y: 0.5, z: -0.5 },
  };

  const updatedObjects = updateConnectedPlumbing(movedPump, [movedPump, elbow], edges);
  const updatedElbow = updatedObjects.find((o) => o.id === 'elbow-1');
  assert.ok(updatedElbow);

  const newPumpOutPos = getWorldPortPosition(movedPump, pumpOut);
  const newElbowSocketPos = getWorldPortPosition(updatedElbow, getComponentPorts(updatedElbow).find((p) => p.id === 'socket-2')!);

  const dist = Math.hypot(
    newElbowSocketPos.x - newPumpOutPos.x,
    newElbowSocketPos.y - newPumpOutPos.y,
    newElbowSocketPos.z - newPumpOutPos.z
  );
  assert.ok(dist < 0.005, `Elbow socket must snap to pump discharge (dist was ${dist})`);
});

test('updateConnectedPlumbing BFS cascades through multi-component plumbing train', () => {
  // Chain: Pump -> Elbow -> Straight Pipe -> Outlet
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump', { x: 0, y: 0, z: 0 });
  const elbow = createTestObject('elbow-1', 'elbow-pipe', 'Elbow', { x: 0, y: 0.1, z: 0 });
  const pipe = createTestObject('pipe-1', 'straight-pipe', 'Pipe', { x: 0.1, y: 0.1, z: 0 });
  const outlet = createTestObject('outlet-1', 'water-outlet', 'Outlet', { x: 0.3, y: 0.1, z: 0 });

  const edges: ConnectionEdge[] = [
    createConnectionEdge('pump-1', 'discharge', 'elbow-1', 'socket-2'),
    createConnectionEdge('elbow-1', 'socket-1', 'pipe-1', 'port-a'),
    createConnectionEdge('pipe-1', 'port-b', 'outlet-1', 'coupling'),
  ];

  // Move pump
  const movedPump = { ...pump, position: { x: 2.0, y: 1.0, z: 0.0 } };

  const updated = updateConnectedPlumbing(movedPump, [movedPump, elbow, pipe, outlet], edges);

  const uElbow = updated.find((o) => o.id === 'elbow-1')!;
  const uPipe = updated.find((o) => o.id === 'pipe-1')!;
  assert.ok(uElbow, 'Elbow must be updated');
  assert.ok(uPipe, 'Pipe must be updated via cascading queue');

  // Verify elbow moved significantly toward x=2.0
  assert.ok(uElbow.position.x > 1.5, 'Elbow must have followed the pump');
});

// -----------------------------------------------------------------------------
// SUITE 6: Connection Graph Diagnostics & Missing Connection Detection
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 6: Connection Graph Diagnostics & Missing Connection Detection ---');

test('analyzeConnectionGraph identifies disconnected components and open ports', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump');
  const pipe = createTestObject('pipe-1', 'straight-pipe', 'Pipe');

  // No edges yet
  const analysis = analyzeConnectionGraph([pump, pipe], []);
  assert.strictEqual(analysis.openPortCount, 4); // 2 on pump + 2 on pipe
  assert.strictEqual(analysis.connectedPortCount, 0);
  assert.strictEqual(analysis.connectedEdgeCount, 0);
  assert.ok(analysis.issues.some((i) => i.componentId === 'pump-1'));
});

test('analyzeConnectionGraph warns about dangling terminating pipe/elbow sockets', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump');
  const pipe = createTestObject('pipe-1', 'straight-pipe', 'Pipe');

  // Connect pump discharge to pipe port-a, but leave pipe port-b open
  const edges = [
    createConnectionEdge('pump-1', 'discharge', 'pipe-1', 'port-a'),
  ];

  const analysis = analyzeConnectionGraph([pump, pipe], edges);
  assert.ok(analysis.issues.length > 0, 'Should generate issues for open pipe socket');
  assert.ok(
    analysis.issues.some((w) => w.message.includes('Terminating Pipe Socket') || w.message.includes('open')),
    'Should specifically warn that pipe has an open socket'
  );
});

test('analyzeConnectionGraph identifies complete flow paths from pump to outlet', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump');
  const elbow = createTestObject('elbow-1', 'elbow-pipe', 'Elbow');
  const pipe = createTestObject('pipe-1', 'straight-pipe', 'Pipe');
  const outlet = createTestObject('outlet-1', 'water-outlet', 'Outlet');

  const edges: ConnectionEdge[] = [
    createConnectionEdge('pump-1', 'discharge', 'elbow-1', 'socket-2'),
    createConnectionEdge('elbow-1', 'socket-1', 'pipe-1', 'port-a'),
    createConnectionEdge('pipe-1', 'port-b', 'outlet-1', 'coupling'),
  ];

  const analysis = analyzeConnectionGraph([pump, elbow, pipe, outlet], edges);
  assert.strictEqual(analysis.chains.length, 1, 'Should find 1 continuous flow path');
  assert.ok(analysis.chains[0].includes('pump-1'));
  assert.ok(analysis.chains[0].includes('outlet-1'));
  assert.strictEqual(analysis.connectedEdgeCount, 3);
});

test('analyzeConnectionGraph flags invalid orphan edges that reference non-existent objects', () => {
  const pump = createTestObject('pump-1', 'submersible-pump', 'Pump');
  const orphanEdge = createConnectionEdge('pump-1', 'discharge', 'ghost-object-999', 'ghost-port');

  const analysis = analyzeConnectionGraph([pump], [orphanEdge]);
  assert.strictEqual(analysis.isValid, false);
  assert.ok(analysis.issues.some((i) => i.type === 'orphan-edge' && i.componentId === 'ghost-object-999'));
});

console.log('\n================================================================');
console.log(`  ALL ${passCount} CONNECTION SYSTEM TESTS PASSED SUCCESSFULLY!`);
console.log('================================================================\n');
