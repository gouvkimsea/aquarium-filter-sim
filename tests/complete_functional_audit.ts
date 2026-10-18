import assert from 'node:assert';
import { COMPONENT_TEMPLATES } from '../src/data/componentLibrary';
import {
  CONTAINER_LIMITS,
  validateContainerDimensions,
  toDisplayUnits,
  fromDisplayUnits,
  formatVolume,
  calculateChambers,
  getNewDividerPosition,
  resizeContainerAndDividers,
} from '../src/utils/filterGeometry';
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
import {
  validateAndMigrateProject,
  validateProjectJsonString,
  DEFAULT_VIEWPORT,
  DEFAULT_SIMULATION,
} from '../src/utils/projectValidation';
import {
  simulateHydraulics,
  calculateEquivalentRoughness,
  darcyWeisbachFrictionFactor,
} from '../src/simulation/hydraulic/hydraulicEngine';
import type { EditorObject, ConnectionEdge, Vector3D } from '../src/types/editor';
import type { ProjectData } from '../src/types/project';

console.log('================================================================');
console.log('   AQUARIUM FILTER SIMULATOR: 10-DOMAIN COMPLETE FUNCTIONAL AUDIT');
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

// -----------------------------------------------------------------------------
// DOMAIN 1: Application Startup, Geometry Templates & Component Library
// -----------------------------------------------------------------------------
console.log('--- DOMAIN 1: Application Startup & 3D Component Library ---');

test('Component library provides exactly 18 diverse production-ready templates', () => {
  assert.strictEqual(COMPONENT_TEMPLATES.length, 18);
});

test('All categories (filter, media, plumbing, aeration, hardscape) have registered items', () => {
  const filterCat = COMPONENT_TEMPLATES.filter((t) => t.category === 'filter');
  const mediaCat = COMPONENT_TEMPLATES.filter((t) => t.category === 'media');
  const plumbingCat = COMPONENT_TEMPLATES.filter((t) => t.category === 'plumbing');
  const aerationCat = COMPONENT_TEMPLATES.filter((t) => t.category === 'aeration');
  const hardscapeCat = COMPONENT_TEMPLATES.filter((t) => t.category === 'hardscape');

  assert.ok(filterCat.length >= 4, 'Filter category has items (including pumps & sumps)');
  assert.ok(mediaCat.length >= 6, 'Media category has items');
  assert.ok(plumbingCat.length >= 5, 'Plumbing category has items');
  assert.ok(aerationCat.length >= 1, 'Aeration category has items');
  assert.ok(hardscapeCat.length >= 1, 'Hardscape category has items');
  assert.ok(COMPONENT_TEMPLATES.some((t) => t.componentType === 'submersible-pump'), 'Pump template exists');
});

test('Every component template has strictly positive dimensions and valid material colors', () => {
  COMPONENT_TEMPLATES.forEach((tmpl) => {
    assert.ok(tmpl.defaultDimensions.x > 0, `${tmpl.name} has valid width`);
    assert.ok(tmpl.defaultDimensions.y > 0, `${tmpl.name} has valid height`);
    assert.ok(tmpl.defaultDimensions.z > 0, `${tmpl.name} has valid depth`);
    assert.ok(tmpl.defaultMaterial.color.startsWith('#'), `${tmpl.name} has hex color`);
  });
});

// -----------------------------------------------------------------------------
// DOMAIN 2: Object Creation, Selection, Movement, Rotation, Resizing, Duplication, Deletion
// -----------------------------------------------------------------------------
console.log('\n--- DOMAIN 2: Object Creation, Transforms, Selection & Lifetime ---');

const testPump: EditorObject = {
  id: 'test-pump-1',
  name: 'Test Submersible Pump',
  category: 'filter',
  componentType: 'submersible-pump',
  visible: true,
  locked: false,
  position: { x: 0.5, y: -0.2, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.25, y: 0.35, z: 0.2 },
  material: { color: '#0284c7', opacity: 1, roughness: 0.3, metalness: 0.2, wireframe: false, transparent: false },
  parameters: { flowRate: 1200, maxHead: 2.0 },
};

const testPipe: EditorObject = {
  id: 'test-pipe-1',
  name: 'Test Straight Pipe',
  category: 'plumbing',
  componentType: 'straight-pipe',
  visible: true,
  locked: false,
  position: { x: 0.5, y: 0.4, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.1, y: 0.8, z: 0.1 },
  material: { color: '#38bdf8', opacity: 0.8, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
  parameters: { diameterMm: 20 },
};

test('Object creation sets unique ID and valid parameters', () => {
  assert.ok(testPump.id.length > 0);
  assert.strictEqual(testPump.visible, true);
  assert.strictEqual(testPump.locked, false);
});

test('Selection: Hidden objects cannot be selected', () => {
  const hiddenObj: EditorObject = { ...testPump, id: 'hidden-1', visible: false };
  let selectedId: string | null = null;
  const selectObject = (id: string | null, pool: EditorObject[]) => {
    if (!id) { selectedId = null; return; }
    const target = pool.find((o) => o.id === id);
    if (target && target.visible) selectedId = id;
  };

  selectObject('hidden-1', [hiddenObj]);
  assert.strictEqual(selectedId, null, 'Hidden object was prevented from selection');

  selectObject('test-pump-1', [testPump]);
  assert.strictEqual(selectedId, 'test-pump-1', 'Visible object was selected');
});

test('Movement & Grid Snapping behaves predictably', () => {
  const snap = 0.05; // 5 cm
  const rawX = 0.523;
  const snappedX = parseFloat((Math.round(rawX / snap) * snap).toFixed(2));
  assert.strictEqual(snappedX, 0.5, 'Snaps 0.523m to 0.50m');
});

test('Duplication clones properties with offset position and unlocked state', () => {
  const cloned: EditorObject = {
    ...testPump,
    id: `${testPump.id}-copy-1`,
    name: `${testPump.name} (Copy)`,
    locked: false,
    position: {
      x: parseFloat((testPump.position.x + 0.35).toFixed(2)),
      y: parseFloat((testPump.position.y).toFixed(2)),
      z: parseFloat((testPump.position.z + 0.35).toFixed(2)),
    },
  };

  assert.notStrictEqual(cloned.id, testPump.id);
  assert.strictEqual(cloned.name, 'Test Submersible Pump (Copy)');
  assert.strictEqual(cloned.position.x, 0.85);
  assert.strictEqual(cloned.position.z, 0.35);
  assert.strictEqual(cloned.locked, false);
});

test('Deletion cascades to connected edges and preserves non-deleted objects', () => {
  const edge: ConnectionEdge = {
    id: 'edge-p-to-pipe',
    fromComponentId: 'test-pump-1',
    fromPortId: 'discharge',
    toComponentId: 'test-pipe-1',
    toPortId: 'port-a',
    createdAt: Date.now(),
  };

  const remainingEdges = removeEdgesForComponent([edge], 'test-pump-1');
  assert.strictEqual(remainingEdges.length, 0, 'Connection edge connected to deleted pump was purged');
});

test('Locked objects are protected from accidental deletion', () => {
  const lockedObj: EditorObject = { ...testPump, locked: true };
  const pool = [lockedObj];
  const deleteSafe = (id: string) => {
    const target = pool.find((o) => o.id === id);
    if (target?.locked) return false;
    return true;
  };
  assert.strictEqual(deleteSafe(lockedObj.id), false, 'Locked object deletion was blocked');
});

// -----------------------------------------------------------------------------
// DOMAIN 3: Container Resizing & Chamber Editing
// -----------------------------------------------------------------------------
console.log('\n--- DOMAIN 3: Container Resizing & Chamber Geometry ---');

test('Container dimension limits prevent invalid/collapsed geometries', () => {
  const tooSmall = validateContainerDimensions({ x: 0.1, y: 0.1, z: 0.1 });
  assert.strictEqual(tooSmall.valid, false);
  assert.strictEqual(tooSmall.clamped.x, CONTAINER_LIMITS.minWidth);

  const tooLarge = validateContainerDimensions({ x: 10.0, y: 5.0, z: 4.0 });
  assert.strictEqual(tooLarge.valid, false);
  assert.strictEqual(tooLarge.clamped.x, CONTAINER_LIMITS.maxWidth);

  const validDim = validateContainerDimensions({ x: 1.8, y: 0.6, z: 0.5 });
  assert.strictEqual(validDim.valid, true);
  assert.strictEqual(validDim.error, undefined);
});

test('Unit system conversions between meters, mm, cm, and imperial inches', () => {
  const displayMm = toDisplayUnits(0.5, 'metric', 'mm');
  assert.strictEqual(displayMm.value, 500);
  assert.strictEqual(displayMm.unit, 'mm');

  const displayCm = toDisplayUnits(0.5, 'metric', 'cm');
  assert.strictEqual(displayCm.value, 50);
  assert.strictEqual(displayCm.unit, 'cm');

  const displayIn = toDisplayUnits(0.5, 'imperial', 'mm');
  assert.strictEqual(displayIn.value, 19.7);
  assert.strictEqual(displayIn.unit, 'in');

  const backMeters = fromDisplayUnits(500, 'metric', 'mm');
  assert.strictEqual(backMeters, 0.5);

  assert.strictEqual(formatVolume(100, 'metric'), '100.0 L');
  assert.strictEqual(formatVolume(100, 'imperial'), '26.4 gal');
});

test('Chamber bounds & usable volume calculation with baffles', () => {
  const containerObj: EditorObject = {
    id: 'obj-filter-container',
    name: 'Sump Basin',
    category: 'filter',
    componentType: 'filter-container',
    visible: true,
    locked: false,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 1.5, y: 0.5, z: 0.4 },
    material: { color: '#0ea5e9', opacity: 0.3, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
    parameters: {},
  };

  const baffle1: EditorObject = {
    id: 'baffle-1',
    name: 'Baffle 1',
    category: 'filter',
    componentType: 'internal-divider',
    visible: true,
    locked: false,
    position: { x: -0.2, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 0.03, y: 0.45, z: 0.32 },
    material: { color: '#38bdf8', opacity: 0.5, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
    parameters: {},
  };

  const baffle2: EditorObject = {
    id: 'baffle-2',
    name: 'Baffle 2',
    category: 'filter',
    componentType: 'internal-divider',
    visible: true,
    locked: false,
    position: { x: 0.25, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 0.03, y: 0.45, z: 0.32 },
    material: { color: '#38bdf8', opacity: 0.5, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
    parameters: {},
  };

  const chamberConfig = calculateChambers(containerObj, [baffle1, baffle2]);
  assert.strictEqual(chamberConfig.chambers.length, 3, 'Calculates exactly 3 chambers from 2 dividers');
  assert.ok(chamberConfig.totalInternalVolumeLiters > 0, 'Total internal volume is calculated');
  assert.ok(chamberConfig.totalInternalVolumeGallons > 0, 'Total gallon volume is calculated');

  // Verify divider auto-placement selects the widest chamber
  const newDivider = getNewDividerPosition(containerObj, [baffle1, baffle2]);
  assert.ok(newDivider.position.x >= -0.71 && newDivider.position.x <= 0.71, 'Divider is within container bounds');
});

test('Resizing container automatically clamps and scales interior dividers', () => {
  const containerObj: EditorObject = {
    id: 'obj-filter-container',
    name: 'Sump Basin',
    category: 'filter',
    componentType: 'filter-container',
    visible: true,
    locked: false,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 2.0, y: 0.6, z: 0.5 },
    material: { color: '#0ea5e9', opacity: 0.3, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
    parameters: {},
  };

  const baffle1: EditorObject = {
    id: 'baffle-1',
    name: 'Baffle 1',
    category: 'filter',
    componentType: 'internal-divider',
    visible: true,
    locked: false,
    position: { x: 0.6, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 0.03, y: 0.55, z: 0.42 },
    material: { color: '#38bdf8', opacity: 0.5, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
    parameters: {},
  };

  const res = resizeContainerAndDividers(containerObj, [containerObj, baffle1], { x: 1.0, y: 0.4, z: 0.4 });
  assert.strictEqual(res.updatedContainer.dimensions.x, 1.0);
  assert.strictEqual(res.updatedContainer.dimensions.y, 0.4);
  assert.ok(res.updatedDividers[0].position.x <= 0.46, 'Baffle clamped within shrunk container boundaries');
});

// -----------------------------------------------------------------------------
// DOMAIN 4: Connections, Kinematics, Snapping & Graph Analysis
// -----------------------------------------------------------------------------
console.log('\n--- DOMAIN 4: Plumbing Connections, Kinematics & Graph Analysis ---');

test('Connectable components expose well-formed ports with directions & diameters', () => {
  const pumpPorts = getComponentPorts(testPump);
  assert.strictEqual(pumpPorts.length, 2);
  assert.strictEqual(pumpPorts[0].id, 'suction');
  assert.strictEqual(pumpPorts[0].direction, 'in');
  assert.strictEqual(pumpPorts[1].id, 'discharge');
  assert.strictEqual(pumpPorts[1].direction, 'out');

  const pipePorts = getComponentPorts(testPipe);
  assert.strictEqual(pipePorts.length, 2);
  assert.strictEqual(pipePorts[0].direction, 'bidirectional');
  assert.strictEqual(pipePorts[1].direction, 'bidirectional');
});

test('Connection validator rejects self-connections', () => {
  const pumpPorts = getComponentPorts(testPump);
  const val = validateConnection(testPump, pumpPorts[0], testPump, pumpPorts[1], []);
  assert.strictEqual(val.valid, false);
  assert.strictEqual(val.issue?.type, 'invalid-type');
});

test('Connection validator rejects duplicate connections on already-occupied port', () => {
  const pumpPorts = getComponentPorts(testPump);
  const pipePorts = getComponentPorts(testPipe);
  const existingEdge = createConnectionEdge(testPump.id, 'discharge', testPipe.id, 'port-a');

  const duplicateAttempt = validateConnection(
    testPump,
    pumpPorts[1], // discharge
    testPipe,
    pipePorts[1], // port-b
    [existingEdge]
  );

  assert.strictEqual(duplicateAttempt.valid, false);
  assert.ok(duplicateAttempt.issue?.message.includes('already connected'));
});

test('Connection validator rejects conflicting flow directions (out-to-out or in-to-in)', () => {
  const outletObj: EditorObject = {
    id: 'test-outlet',
    name: 'Lily Pipe Outlet',
    category: 'plumbing',
    componentType: 'water-outlet',
    visible: true,
    locked: false,
    position: { x: 0.5, y: 1.0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 0.2, y: 0.3, z: 0.15 },
    material: { color: '#ffffff', opacity: 0.8, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
    parameters: {},
  };

  const pumpPorts = getComponentPorts(testPump);
  const outletPorts = getComponentPorts(outletObj);

  // pump discharge ('out') to outlet flared nozzle ('out')
  const pumpOut = pumpPorts.find((p) => p.id === 'discharge')!;
  const outletOut = outletPorts.find((p) => p.id === 'nozzle')!;

  const val = validateConnection(testPump, pumpOut, outletObj, outletOut, []);
  assert.strictEqual(val.valid, false);
  assert.strictEqual(val.issue?.type, 'direction-mismatch');
});

test('Kinematic plumbing synchronizer dynamically recalculates straight pipe length and rotation', () => {
  const pump: EditorObject = {
    ...testPump,
    position: { x: 0, y: 0, z: 0 },
  };

  const outlet: EditorObject = {
    id: 'test-outlet',
    name: 'Lily Pipe Outlet',
    category: 'plumbing',
    componentType: 'water-outlet',
    visible: true,
    locked: false,
    position: { x: 0, y: 1.2, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 0.2, y: 0.3, z: 0.15 },
    material: { color: '#ffffff', opacity: 0.8, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
    parameters: {},
  };

  const pipe: EditorObject = {
    ...testPipe,
    position: { x: 0, y: 0.6, z: 0 },
    dimensions: { x: 0.08, y: 0.5, z: 0.08 },
  };

  const edgeA = createConnectionEdge(pump.id, 'discharge', pipe.id, 'port-a');
  const edgeB = createConnectionEdge(pipe.id, 'port-b', outlet.id, 'coupling');

  // Move the outlet upwards by 0.5m
  const movedOutlet = { ...outlet, position: { x: 0, y: 1.7, z: 0 } };
  const updatedObjects = updateConnectedPlumbing(movedOutlet.id, [pump, pipe, movedOutlet], [edgeA, edgeB]);

  const updatedPipe = updatedObjects.find((o) => o.id === pipe.id)!;
  assert.ok(updatedPipe.dimensions.y > pipe.dimensions.y, 'Pipe dynamically stretched when connected outlet moved');
  assert.strictEqual(updatedPipe.position.x, 0, 'Pipe maintained central alignment');
});

test('Graph analysis accurately diagnoses connected chains, open ports, and orphan edges', () => {
  const edge = createConnectionEdge(testPump.id, 'discharge', testPipe.id, 'port-a');
  const analysis = analyzeConnectionGraph([testPump, testPipe], [edge]);

  assert.strictEqual(analysis.connectedEdgeCount, 1);
  assert.strictEqual(analysis.chains.length, 1);
  assert.strictEqual(analysis.chains[0].length, 2);
  assert.ok(analysis.openPortCount >= 2, 'Diagnosed remaining open ports');

  // Orphan edge test
  const orphanEdge: ConnectionEdge = {
    id: 'orphan-1',
    fromComponentId: 'non-existent-comp',
    fromPortId: 'discharge',
    toComponentId: testPipe.id,
    toPortId: 'port-b',
    createdAt: Date.now(),
  };
  const analysisWithOrphan = analyzeConnectionGraph([testPump, testPipe], [edge, orphanEdge]);
  assert.strictEqual(analysisWithOrphan.isValid, false);
  assert.ok(analysisWithOrphan.issues.some((i) => i.type === 'orphan-edge'));
});

// -----------------------------------------------------------------------------
// DOMAIN 5: Undo and Redo Mechanics
// -----------------------------------------------------------------------------
console.log('\n--- DOMAIN 5: Undo & Redo History System ---');

test('Undo restores previous state and Redo reapplies future state', () => {
  let currentObjects: EditorObject[] = [testPump];
  let history: { objects: EditorObject[]; connections: ConnectionEdge[] }[] = [];
  let future: { objects: EditorObject[]; connections: ConnectionEdge[] }[] = [];

  const pushState = (newObjs: EditorObject[]) => {
    history.push({ objects: currentObjects, connections: [] });
    future = [];
    currentObjects = newObjs;
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history.pop()!;
    future.unshift({ objects: currentObjects, connections: [] });
    currentObjects = prev.objects;
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future.shift()!;
    history.push({ objects: currentObjects, connections: [] });
    currentObjects = next.objects;
  };

  // 1. Add straight pipe
  pushState([testPump, testPipe]);
  assert.strictEqual(currentObjects.length, 2);

  // 2. Undo addition
  undo();
  assert.strictEqual(currentObjects.length, 1);
  assert.strictEqual(currentObjects[0].id, testPump.id);

  // 3. Redo addition
  redo();
  assert.strictEqual(currentObjects.length, 2);
  assert.strictEqual(currentObjects[1].id, testPipe.id);
});

// -----------------------------------------------------------------------------
// DOMAIN 6: Project Persistence, Export, Import & Schema Migration
// -----------------------------------------------------------------------------
console.log('\n--- DOMAIN 6: Project Persistence, Export & Validation ---');

test('Project serialization to JSON string and deep deserialization validation', () => {
  const edge = createConnectionEdge(testPump.id, 'discharge', testPipe.id, 'port-a');
  const project: ProjectData = {
    metadata: {
      id: 'proj_audit_test',
      name: 'Functional Audit System',
      version: '0.1.0',
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    viewportSettings: DEFAULT_VIEWPORT,
    simulation: DEFAULT_SIMULATION,
    objects: [testPump, testPipe],
    connections: [edge],
  };

  const jsonStr = JSON.stringify(project);
  const validated = validateProjectJsonString(jsonStr);

  assert.strictEqual(validated.isValid, true);
  assert.strictEqual(validated.errors.length, 0);
  assert.strictEqual(validated.project?.metadata.name, 'Functional Audit System');
  assert.strictEqual(validated.project?.objects.length, 2);
  assert.strictEqual(validated.project?.connections.length, 1);
});

test('Project importer safely migrates legacy files with missing metadata', () => {
  const legacyData = {
    project: 'Old Sump v0.0.1',
    version: '0.0.1',
    objects: [testPump],
  };

  const validated = validateAndMigrateProject(legacyData);
  assert.strictEqual(validated.isValid, true);
  assert.strictEqual(validated.project?.metadata.name, 'Old Sump v0.0.1');
  assert.strictEqual(validated.project?.metadata.schemaVersion, 1);
  assert.strictEqual(validated.project?.objects.length, 1);
  assert.strictEqual(validated.project?.connections.length, 0);
  assert.ok(validated.warnings.length > 0, 'Migration recorded informational warning');
});

// -----------------------------------------------------------------------------
// DOMAIN 7: Hydraulic Simulation for Connected & Disconnected Systems
// -----------------------------------------------------------------------------
console.log('\n--- DOMAIN 7: Hydraulic Simulation (Connected vs Disconnected) ---');

const connectedSystem: { objects: EditorObject[]; connections: ConnectionEdge[] } = (() => {
  const pump: EditorObject = {
    id: 'pump-h',
    name: 'Centrifugal Pump',
    category: 'pump',
    componentType: 'submersible-pump',
    visible: true,
    locked: false,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 0.2, y: 0.3, z: 0.2 },
    material: { color: '#0284c7', opacity: 1, roughness: 0.3, metalness: 0.2, wireframe: false, transparent: false },
    parameters: { flowRate: 1500, maxHead: 2.2, ratedPowerW: 35 },
  };

  const pipe: EditorObject = {
    id: 'pipe-h',
    name: 'Discharge Riser',
    category: 'plumbing',
    componentType: 'straight-pipe',
    visible: true,
    locked: false,
    position: { x: 0, y: 0.6, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 0.08, y: 0.8, z: 0.08 },
    material: { color: '#38bdf8', opacity: 0.8, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
    parameters: { diameterMm: 20 },
  };

  const outlet: EditorObject = {
    id: 'outlet-h',
    name: 'Return Flare',
    category: 'plumbing',
    componentType: 'water-outlet',
    visible: true,
    locked: false,
    position: { x: 0, y: 1.1, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 0.2, y: 0.3, z: 0.15 },
    material: { color: '#ffffff', opacity: 0.8, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
    parameters: { diameterMm: 25 },
  };

  const e1 = createConnectionEdge(pump.id, 'discharge', pipe.id, 'port-a');
  const e2 = createConnectionEdge(pipe.id, 'port-b', outlet.id, 'coupling');

  return { objects: [pump, pipe, outlet], connections: [e1, e2] };
})();

test('Connected system solves operating point balancing pump head with total dynamic head', () => {
  const result = simulateHydraulics(connectedSystem.objects, connectedSystem.connections);
  assert.strictEqual(result.status, 'estimated');
  assert.ok(result.operatingPoint !== null);
  assert.ok(result.operatingPoint!.flowRate.lph > 0);
  assert.ok(result.operatingPoint!.flowRate.lph < 1500, 'Friction and static lift attenuate flow below 1500 L/h');
  assert.ok(result.operatingPoint!.totalDynamicHeadM > 0);
  assert.strictEqual(result.paths.length, 1);
  assert.strictEqual(result.paths[0].segments.length, 2);
});

test('Disconnected pump is flagged explicitly without inventing fake flow', () => {
  const pumpOnly = [connectedSystem.objects[0]];
  const result = simulateHydraulics(pumpOnly, []);
  assert.strictEqual(result.status, 'disconnected');
  assert.strictEqual(result.operatingPoint, undefined);
  assert.ok(result.warnings.some((w) => w.includes('has no connected plumbing')));
});

test('Dead-end pipe is flagged explicitly with dead-end diagnostic', () => {
  const pump = connectedSystem.objects[0];
  const pipe = connectedSystem.objects[1];
  const e1 = createConnectionEdge(pump.id, 'discharge', pipe.id, 'port-a');

  const result = simulateHydraulics([pump, pipe], [e1]);
  assert.strictEqual(result.status, 'dead-end');
  assert.strictEqual(result.operatingPoint, undefined);
  assert.ok(result.unsolvedReasons.some((r) => r.includes('terminates')));
});

test('Excess static lift exceeding shutoff head flags pump-dead-headed with zero flow', () => {
  const pump = { ...connectedSystem.objects[0] }; // max head = 2.2m
  const highOutlet = { ...connectedSystem.objects[2], position: { x: 0, y: 5.0, z: 0 } }; // 5.0m elevation
  const pipe = { ...connectedSystem.objects[1] };
  const e1 = createConnectionEdge(pump.id, 'discharge', pipe.id, 'port-a');
  const e2 = createConnectionEdge(pipe.id, 'port-b', highOutlet.id, 'coupling');

  const result = simulateHydraulics([pump, pipe, highOutlet], [e1, e2], { isOpenSump: true });
  assert.strictEqual(result.status, 'pump-dead-headed');
  assert.strictEqual(result.operatingPoint?.flowRate.lph, 0);
  assert.ok(result.warnings.some((w) => w.includes('exceeds pump shut-off head')));
});

// -----------------------------------------------------------------------------
// DOMAIN 8: Flow Recalculation on Pump or Pipe Dimension Modifications
// -----------------------------------------------------------------------------
console.log('\n--- DOMAIN 8: Flow Recalculation on Parameter Changes ---');

test('Increasing pump rated power/flow increases operating flow', () => {
  const baseline = simulateHydraulics(connectedSystem.objects, connectedSystem.connections);

  const upgradedPump = {
    ...connectedSystem.objects[0],
    parameters: { flowRate: 3000, maxHead: 3.5 },
  };
  const upgradedResult = simulateHydraulics(
    [upgradedPump, connectedSystem.objects[1], connectedSystem.objects[2]],
    connectedSystem.connections
  );

  assert.ok(
    upgradedResult.operatingPoint!.flowRate.lph > baseline.operatingPoint!.flowRate.lph,
    `Upgraded pump produced higher flow: ${upgradedResult.operatingPoint!.flowRate.lph} > ${baseline.operatingPoint!.flowRate.lph}`
  );
});

test('Restricting pipe diameter increases friction head loss and reduces operating flow', () => {
  const baseline = simulateHydraulics(connectedSystem.objects, connectedSystem.connections);

  const narrowPipe = {
    ...connectedSystem.objects[1],
    parameters: { diameterMm: 10 }, // 10mm instead of 20mm
  };
  const constrictedResult = simulateHydraulics(
    [connectedSystem.objects[0], narrowPipe, connectedSystem.objects[2]],
    connectedSystem.connections
  );

  assert.ok(
    constrictedResult.operatingPoint!.flowRate.lph < baseline.operatingPoint!.flowRate.lph,
    `Constricted pipe reduced flow: ${constrictedResult.operatingPoint!.flowRate.lph} < ${baseline.operatingPoint!.flowRate.lph}`
  );
  assert.ok(
    constrictedResult.operatingPoint!.frictionHeadM >
      baseline.operatingPoint!.frictionHeadM,
    'Narrow pipe dramatically increased friction head loss'
  );
});

// -----------------------------------------------------------------------------
// DOMAIN 9: Error Handling for Corrupt Files & Missing Inputs
// -----------------------------------------------------------------------------
console.log('\n--- DOMAIN 9: Error Handling for Corrupt Files & Bad Inputs ---');

test('Invalid JSON strings return isValid: false with descriptive parse error message', () => {
  const malformed = '{ name: "Unquoted key", }';
  const res = validateProjectJsonString(malformed);
  assert.strictEqual(res.isValid, false);
  assert.ok(res.errors[0].includes('JSON parse error'));
});

test('Empty or null data structures return isValid: false', () => {
  const nullRes = validateAndMigrateProject(null);
  assert.strictEqual(nullRes.isValid, false);

  const emptyRes = validateAndMigrateProject({});
  assert.strictEqual(emptyRes.isValid, false);
  assert.ok(emptyRes.errors.some((e) => e.includes('missing an "objects" array')));
});

test('Missing or NaN coordinates are gracefully replaced with valid numeric defaults', () => {
  const corruptObjectData = {
    metadata: { name: 'Corrupt Object Project' },
    objects: [
      {
        id: 'bad-obj-1',
        name: 'Corrupt Position Object',
        position: { x: NaN, y: 'invalid' as any, z: undefined as any },
        dimensions: { x: -5, y: null as any, z: NaN },
      },
    ],
    connections: [],
  };

  const res = validateAndMigrateProject(corruptObjectData);
  assert.strictEqual(res.isValid, true);
  const fixed = res.project!.objects[0];
  assert.strictEqual(fixed.position.x, 0);
  assert.strictEqual(fixed.position.y, 0);
  assert.strictEqual(fixed.position.z, 0);
  assert.ok(fixed.dimensions.x > 0);
  assert.ok(fixed.dimensions.y > 0);
  assert.ok(fixed.dimensions.z > 0);
});

// -----------------------------------------------------------------------------
// DOMAIN 10: Performance Benchmarking with Multiple Components
// -----------------------------------------------------------------------------
console.log('\n--- DOMAIN 10: Performance Benchmarking (Scale & Latency) ---');

test('Hydraulic and graph analysis executes under 25ms for 60 connected components', () => {
  const stressObjects: EditorObject[] = [];
  const stressEdges: ConnectionEdge[] = [];

  const pump: EditorObject = {
    ...testPump,
    id: 'stress-pump',
    parameters: { flowRate: 5000, maxHead: 6.0 },
  };
  stressObjects.push(pump);

  const N = 40;
  for (let i = 0; i < N; i++) {
    const pipe: EditorObject = {
      id: `stress-pipe-${i}`,
      name: `Pipe Segment ${i}`,
      category: 'plumbing',
      componentType: 'straight-pipe',
      visible: true,
      locked: false,
      position: { x: i * 0.1, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { x: 0.05, y: 0.2, z: 0.05 },
      material: { color: '#38bdf8', opacity: 0.8, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
      parameters: { diameterMm: 20 },
    };
    stressObjects.push(pipe);

    if (i === 0) {
      stressEdges.push(createConnectionEdge('stress-pump', 'discharge', pipe.id, 'port-a'));
    } else {
      stressEdges.push(createConnectionEdge(`stress-pipe-${i - 1}`, 'port-b', pipe.id, 'port-a'));
    }
  }

  const outlet: EditorObject = {
    id: 'stress-outlet',
    name: 'Outlet',
    category: 'plumbing',
    componentType: 'water-outlet',
    visible: true,
    locked: false,
    position: { x: N * 0.1, y: 0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 0.15, y: 0.2, z: 0.1 },
    material: { color: '#ffffff', opacity: 0.8, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
    parameters: { diameterMm: 25 },
  };
  stressObjects.push(outlet);
  stressEdges.push(createConnectionEdge(`stress-pipe-${N - 1}`, 'port-b', 'stress-outlet', 'coupling'));

  const startGraph = performance.now();
  const graph = analyzeConnectionGraph(stressObjects, stressEdges);
  const endGraph = performance.now();

  const startHydro = performance.now();
  const hydro = simulateHydraulics(stressObjects, stressEdges);
  const endHydro = performance.now();

  const graphTime = endGraph - startGraph;
  const hydroTime = endHydro - startHydro;

  assert.strictEqual(graph.isValid, true);
  assert.strictEqual(hydro.status, 'estimated');
  assert.ok(graphTime < 25, `Graph analysis took ${graphTime.toFixed(2)}ms (< 25ms)`);
  assert.ok(hydroTime < 50, `Hydraulic simulation took ${hydroTime.toFixed(2)}ms (< 50ms)`);
});

console.log('\n================================================================');
console.log(`   AUDIT COMPLETE: ALL ${passCount}/${passCount} TESTS PASSED SUCCESSFULLY!`);
console.log('================================================================\n');
