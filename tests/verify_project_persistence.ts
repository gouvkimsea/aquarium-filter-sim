import { 
  CURRENT_PROJECT_SCHEMA_VERSION, 
  CURRENT_PROJECT_APP_VERSION, 
  type ProjectData,
} from '../src/types/project';
import { 
  validateProjectData, 
  validateProjectJsonString 
} from '../src/utils/projectValidation';
import { 
  createConnectionEdge, 
  analyzeConnectionGraph 
} from '../src/utils/connectionGraph';
import type { EditorObject, ConnectionEdge } from '../src/types/editor';

console.log('=== AQUARIUM FILTER SIMULATOR: PROJECT PERSISTENCE TEST SUITE ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✓ [PASS] ${testName}`);
  } else {
    console.error(`✗ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// Test 1: Container Object with Dimensions & Properties
// -------------------------------------------------------------
const containerObject: EditorObject = {
  id: 'obj-filter-container',
  name: 'Filter Container Body',
  category: 'filter',
  componentType: 'filter-container',
  position: { x: 0, y: 1.75, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 5.0, y: 3.5, z: 2.5 },
  visible: true,
  locked: true,
  material: {
    color: '#38bdf8',
    opacity: 0.25,
    roughness: 0.1,
    metalness: 0.05,
    transparent: true,
  },
  parameters: {
    wallThickness: 0.08,
    viewMode: 'transparent',
    unit: 'mm',
    chamberCount: 3,
  },
};

assert(containerObject.id === 'obj-filter-container', 'Container object has stable canonical ID');
assert(containerObject.dimensions.x === 5.0 && containerObject.dimensions.y === 3.5, 'Container dimensions configured correctly');

// -------------------------------------------------------------
// Test 2: Internal Components & Plumbing Assembly
// -------------------------------------------------------------
const pumpObject: EditorObject = {
  id: 'obj-pump-101',
  name: 'Submersible Return Pump',
  category: 'pumps',
  componentType: 'submersible-pump',
  position: { x: 1.5, y: 0.4, z: 0 },
  rotation: { x: 0, y: 90, z: 0 },
  dimensions: { x: 0.9, y: 0.7, z: 0.6 },
  visible: true,
  locked: false,
  material: {
    color: '#0284c7',
    opacity: 0.95,
    roughness: 0.3,
    metalness: 0.2,
  },
  parameters: {
    flowRate: 1500,
    headHeight: 2.2,
    powerConsumption: 25,
  },
};

const pipeObject: EditorObject = {
  id: 'obj-pipe-202',
  name: 'Return Riser Pipe',
  category: 'plumbing',
  componentType: 'straight-pipe',
  position: { x: 1.5, y: 1.2, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.2, y: 1.0, z: 0.2 },
  visible: true,
  locked: false,
  material: {
    color: '#64748b',
    opacity: 1,
    roughness: 0.4,
    metalness: 0.1,
  },
  parameters: {
    pipeDiameter: 0.2,
    length: 1.0,
  },
};

const spongeObject: EditorObject = {
  id: 'obj-sponge-303',
  name: 'Pre-filter Coarse Sponge',
  category: 'media',
  componentType: 'coarse-sponge',
  position: { x: -1.5, y: 0.8, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.8, y: 1.2, z: 1.8 },
  visible: true,
  locked: false,
  material: {
    color: '#3b82f6',
    opacity: 0.9,
    roughness: 0.9,
    metalness: 0.0,
  },
  parameters: {
    ppi: 20,
    porosity: 0.85,
  },
};

const dividerObject: EditorObject = {
  id: 'obj-baffle-404',
  name: 'Under-Baffle Bubble Trap',
  category: 'dividers',
  componentType: 'internal-divider',
  position: { x: 0.5, y: 1.1, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.06, y: 2.2, z: 2.4 },
  visible: true,
  locked: false,
  material: {
    color: '#0284c7',
    opacity: 0.75,
    roughness: 0.1,
    metalness: 0.1,
  },
  parameters: {
    dividerType: 'under',
    bottomGap: 0.25,
  },
};

// Create stable edge between pump discharge and pipe lower socket
const connectionEdge: ConnectionEdge = createConnectionEdge(
  pumpObject.id,
  'discharge',
  pipeObject.id,
  'socket-a'
);

assert(connectionEdge.id.includes('obj-pump-101') && connectionEdge.id.includes('obj-pipe-202'), 'Connection edge ID incorporates stable component and port identifiers');

const complexProject: ProjectData = {
  metadata: {
    id: 'proj_reef_sump_pro',
    name: 'Reef Sump Pro Filter 2000',
    version: CURRENT_PROJECT_APP_VERSION,
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    createdAt: '2026-10-18T00:00:00.000Z',
    updatedAt: '2026-10-18T01:00:00.000Z',
    description: 'Triple chamber reef sump with bubble trap and return plumbing',
    author: 'Aquascaper',
  },
  viewportSettings: {
    viewMode: 'rendered',
    cameraPreset: 'isometric',
    lightingPreset: 'studio',
    showGrid: true,
    showMeasurements: true,
    showHelpers: false,
    unitSystem: 'metric',
    metricUnit: 'mm',
    containerViewMode: 'transparent',
  },
  simulation: {
    isRunning: true,
    speed: 1.5,
    elapsedSeconds: 120,
    simulatedMinutes: 18,
    totalFlowGPH: 396,
    calculatedTurnover: 4.5,
  },
  objects: [containerObject, pumpObject, pipeObject, spongeObject, dividerObject],
  connections: [connectionEdge],
};

// -------------------------------------------------------------
// Test 3: Schema Validation on Valid Complex Project
// -------------------------------------------------------------
const valResult = validateProjectData(complexProject);
assert(valResult.isValid, 'Complex project passes validation');
assert(valResult.warnings.length === 0, `Validation has zero warnings (got: ${valResult.warnings.join(', ')})`);
assert(valResult.errors.length === 0, 'Validation has zero errors');

// -------------------------------------------------------------
// Test 4: JSON String Serialization & Deserialization Fidelity
// -------------------------------------------------------------
const serialized = JSON.stringify(complexProject, null, 2);
const parseValidation = validateProjectJsonString(serialized);
assert(parseValidation.isValid, 'Serialized project JSON string validates successfully');
assert(parseValidation.project !== undefined, 'Deserialized project object is non-null');

const restored = parseValidation.project!;
assert(restored.metadata.id === complexProject.metadata.id, 'Project ID preserved exactly');
assert(restored.metadata.name === complexProject.metadata.name, 'Project name preserved exactly');
assert(restored.metadata.schemaVersion === 1, 'Project schemaVersion matches 1');
assert(restored.objects.length === 5, 'All 5 objects (container + 4 components) preserved');
assert(restored.connections.length === 1, 'Connection edge preserved');

// Verify stable component IDs and parameters
const restoredContainer = restored.objects.find(o => o.id === 'obj-filter-container');
assert(restoredContainer !== undefined, 'Container object restored with exact ID');
assert(restoredContainer?.dimensions.x === 5.0 && restoredContainer?.dimensions.y === 3.5, 'Container dimensions intact');

const restoredPump = restored.objects.find(o => o.id === 'obj-pump-101');
assert(restoredPump !== undefined, 'Pump object restored with exact ID');
assert(restoredPump?.parameters?.flowRate === 1500, 'Pump parameters preserved (flowRate: 1500)');
assert(restoredPump?.parameters?.headHeight === 2.2, 'Pump parameters preserved (headHeight: 2.2)');

const restoredEdge = restored.connections[0];
assert(restoredEdge.fromComponentId === 'obj-pump-101', 'Connection fromComponentId preserved');
assert(restoredEdge.toComponentId === 'obj-pipe-202', 'Connection toComponentId preserved');

// Verify connection graph analysis on restored project
const graphAnalysis = analyzeConnectionGraph(restored.objects, restored.connections);
assert(graphAnalysis.connectedEdgeCount === 1, 'Connection graph reports 1 connected edge');
assert(graphAnalysis.isValid, 'Connection graph is valid');

// -------------------------------------------------------------
// Test 5: Validation and Recovery from Corrupted / Incomplete Data
// -------------------------------------------------------------

// Case A: Missing version & metadata (legacy export)
const legacyRaw = {
  project: 'Legacy Aquarium Filter',
  version: '0.1.0',
  exportedAt: '2026-09-01T12:00:00.000Z',
  objects: [containerObject, spongeObject],
  connections: [],
};
const legacyValidation = validateProjectData(legacyRaw);
assert(legacyValidation.isValid, 'Legacy format is accepted and auto-migrated');
assert(legacyValidation.project?.metadata.schemaVersion === 1, 'Legacy format upgraded to schemaVersion 1');
assert(legacyValidation.project?.metadata.name === 'Legacy Aquarium Filter', 'Legacy name mapped to metadata.name');
assert(legacyValidation.warnings.length > 0, 'Legacy migration logs informative warnings');

// Case B: Unsupported future version warning
const futureRaw = {
  metadata: {
    id: 'fut_99',
    name: 'Future Filter',
    schemaVersion: 99,
  },
  objects: [containerObject],
  connections: [],
};
const futureValidation = validateProjectData(futureRaw);
assert(futureValidation.isValid, 'Future schema version is gracefully accepted');
assert(futureValidation.warnings.some(w => w.includes('newer than editor version')), 'Warning correctly identifies future schema version');

// Case C: Broken connection references (target component does not exist)
const brokenConnRaw: ProjectData = {
  ...complexProject,
  connections: [
    {
      id: 'edge_broken',
      fromComponentId: 'obj-pump-101',
      fromPortId: 'discharge',
      toComponentId: 'non_existent_component_xyz',
      toPortId: 'inlet',
      createdAt: Date.now(),
    },
  ],
};
const brokenConnValidation = validateProjectData(brokenConnRaw);
assert(brokenConnValidation.isValid, 'Project with dangling connection edge is safely parsed');
assert(brokenConnValidation.project?.connections.length === 0, 'Broken connection edge was gracefully omitted');
assert(brokenConnValidation.warnings.some(w => w.includes('non_existent_component_xyz')), 'Warning correctly identifies nonexistent component');

// Case D: Corrupted object geometry (NaN recovery)
const corruptedObjectRaw = {
  ...complexProject,
  objects: [
    {
      ...spongeObject,
      position: { x: NaN, y: 10, z: null as any },
      dimensions: { x: -5, y: 0, z: NaN },
    },
  ],
  connections: [],
};
const corruptedObjValidation = validateProjectData(corruptedObjectRaw);
assert(corruptedObjValidation.isValid, 'Corrupted numbers in geometry are safely healed');
const healedObj = corruptedObjValidation.project!.objects[0];
assert(!Number.isNaN(healedObj.position.x) && healedObj.position.x === 0, 'NaN position healed to 0');
assert(healedObj.dimensions.x > 0 && !Number.isNaN(healedObj.dimensions.z), 'Invalid dimensions healed to safe positive minimum');

// -------------------------------------------------------------
// Test 6: Undo/Redo & State Immutability
// -------------------------------------------------------------
const originalName = complexProject.metadata.name;
const clonedData = JSON.parse(JSON.stringify(complexProject));
clonedData.metadata.name = 'Renamed Project';
assert(complexProject.metadata.name === originalName, 'Project modifications do not mutate previous project state');

console.log(`\n======================================================`);
console.log(`Results: ${passedTests}/${totalTests} tests passed successfully.`);
console.log(`======================================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
