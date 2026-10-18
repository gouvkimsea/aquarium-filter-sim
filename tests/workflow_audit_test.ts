import {
  validateProjectData,
  validateProjectJsonString,
  DEFAULT_VIEWPORT,
} from '../src/utils/projectValidation';
import { simulateHydraulics } from '../src/simulation/hydraulic';
import { COMPONENT_TEMPLATES } from '../src/data/componentLibrary';
import { createConnectionEdge } from '../src/utils/connectionGraph';
import type { EditorObject, ConnectionEdge, ProjectData } from '../src/types/editor';

console.log('=== AQUARIUM FILTER SIMULATOR: WORKFLOW & POLISH AUDIT ===\n');

let totalTests = 0;
let passedTests = 0;

function check(condition: boolean, testName: string, detail?: string) {
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
// Test 1: Component Library Specs & Categorization
// -------------------------------------------------------------
check(COMPONENT_TEMPLATES.length >= 13, `Library contains rich component templates (${COMPONENT_TEMPLATES.length} found)`);

for (const tpl of COMPONENT_TEMPLATES) {
  check(Boolean(tpl.templateId && tpl.name && tpl.category), `Template metadata complete: ${tpl.name}`);
  check(tpl.defaultDimensions.x > 0 && tpl.defaultDimensions.y > 0 && tpl.defaultDimensions.z > 0, `Template dimensions valid: ${tpl.name}`);
  check(Boolean(tpl.defaultMaterial.color), `Template material color defined: ${tpl.name}`);
}

// -------------------------------------------------------------
// Test 2: Build Complete Filter System with Baffles & Media
// -------------------------------------------------------------
const container: EditorObject = {
  id: 'obj-filter-container',
  name: 'Custom Acrylic Sump Basin',
  category: 'filter',
  componentType: 'filter-container',
  visible: true,
  locked: true,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 2.4, y: 1.0, z: 1.2 },
  material: {
    color: '#38bdf8',
    opacity: 0.28,
    roughness: 0.05,
    metalness: 0.0,
    wireframe: false,
    transparent: true,
  },
  parameters: {
    wallThicknessMm: 10,
    usableVolumeLiters: 288,
    flowPattern: 'under-over',
  },
};

const baffle1: EditorObject = {
  id: 'obj-baffle-1',
  name: 'Underflow Baffle 1',
  category: 'filter',
  componentType: 'internal-divider',
  visible: true,
  locked: false,
  position: { x: -0.4, y: 0.05, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.015, y: 0.9, z: 1.18 },
  material: {
    color: '#38bdf8',
    opacity: 0.5,
    roughness: 0.15,
    metalness: 0.0,
    wireframe: false,
    transparent: true,
  },
  parameters: { underflowGapMm: 15 },
};

const coarseSponge: EditorObject = {
  id: 'obj-coarse-sponge-1',
  name: 'Mechanical Coarse Foam',
  category: 'media',
  componentType: 'coarse-sponge',
  visible: true,
  locked: false,
  position: { x: -0.72, y: -0.32, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.45, y: 0.35, z: 1.15 },
  material: {
    color: '#0284c7',
    opacity: 1.0,
    roughness: 0.92,
    metalness: 0.0,
    wireframe: false,
    transparent: false,
  },
};

const ceramicRings: EditorObject = {
  id: 'obj-ceramic-rings-1',
  name: 'Porous Ceramic Bio Rings',
  category: 'media',
  componentType: 'ceramic-bio-rings',
  visible: true,
  locked: false,
  position: { x: 0.0, y: -0.32, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.55, y: 0.35, z: 1.15 },
  material: {
    color: '#e2e8f0',
    opacity: 1.0,
    roughness: 0.92,
    metalness: 0.02,
    wireframe: false,
    transparent: false,
  },
};

const pump: EditorObject = {
  id: 'obj-pump-1',
  name: 'Submersible Return Pump',
  category: 'filter',
  componentType: 'submersible-pump',
  visible: true,
  locked: false,
  position: { x: 0.77, y: -0.35, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.35, y: 0.3, z: 0.28 },
  material: {
    color: '#1e293b',
    opacity: 1.0,
    roughness: 0.2,
    metalness: 0.3,
    wireframe: false,
    transparent: false,
  },
  parameters: {
    flowRate: 1500,
    headHeight: 2.5,
    wattage: 25,
  },
};

const returnPipe: EditorObject = {
  id: 'obj-return-pipe-1',
  name: 'Discharge Return Pipe',
  category: 'plumbing',
  componentType: 'straight-pipe',
  visible: true,
  locked: false,
  position: { x: 0.77, y: 0.4, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.06, y: 1.2, z: 0.06 },
  material: {
    color: '#64748b',
    opacity: 0.85,
    roughness: 0.2,
    metalness: 0.1,
    wireframe: false,
    transparent: true,
  },
  parameters: {
    diameterMm: 20,
    length: 1.2,
  },
};

const lilyPipeOutlet: EditorObject = {
  id: 'obj-lily-outlet-1',
  name: 'Glass Lily Pipe Outlet',
  category: 'plumbing',
  componentType: 'water-outlet',
  visible: true,
  locked: false,
  position: { x: 0.77, y: 1.1, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.12, y: 0.18, z: 0.25 },
  material: {
    color: '#e0f2fe',
    opacity: 0.35,
    roughness: 0.02,
    metalness: 0.0,
    wireframe: false,
    transparent: true,
  },
  parameters: {
    diameterMm: 20,
  },
};

const objects = [container, baffle1, coarseSponge, ceramicRings, pump, returnPipe, lilyPipeOutlet];

const edge1 = createConnectionEdge(pump.id, 'discharge', returnPipe.id, 'port-a');
const edge2 = createConnectionEdge(returnPipe.id, 'port-b', lilyPipeOutlet.id, 'coupling');
const connections: ConnectionEdge[] = [edge1, edge2];

// -------------------------------------------------------------
// Test 3: Hydraulic Simulation Operating Point
// -------------------------------------------------------------
const hydraulicResult = simulateHydraulics(objects, connections, { isOpenSump: false });

check(hydraulicResult.status === 'estimated', 'Hydraulic solver status is estimated');
check(hydraulicResult.isEstimate === true, 'Result explicitly marked as isEstimate: true');
check(hydraulicResult.operatingPoint !== undefined, 'Operating point successfully solved');

const op = hydraulicResult.operatingPoint!;
check(op.flowRate.lph > 0, `Positive operating flow calculated (${op.flowRate.lph} L/h)`);
check(
  op.flowRate.lph < 1500,
  `Flow rate strictly below rated 1500 L/h due to friction & static lift (${op.flowRate.lph} < 1500 L/h)`
);
check(hydraulicResult.paths.length === 1, 'Traced 1 main discharge flow path');
check(hydraulicResult.paths[0].segments.length === 2, 'Path contains 2 pipe/fitting segments');
check(hydraulicResult.paths[0].segments[0].velocityMs > 0, 'Velocity calculated for pipe segment');

// -------------------------------------------------------------
// Test 4: Viewport, Exploded View & Project Persistence
// -------------------------------------------------------------
const viewportSettings = {
  ...DEFAULT_VIEWPORT,
  explodedView: true,
  cameraPreset: 'isometric' as const,
  lightingPreset: 'studio' as const,
  containerViewMode: 'cutaway' as const,
};

const projectData: ProjectData = {
  metadata: {
    id: 'proj_polished_sump_e2e',
    name: 'Polished Multi-Chamber Sump Test',
    version: '0.1.0',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Complete verified filter design.',
  },
  viewportSettings,
  simulation: {
    isRunning: true,
    speed: 1.0,
    elapsedSeconds: 45,
    simulatedMinutes: 12,
    totalFlowGPH: Math.round(op.flowRate.gph),
    calculatedTurnover: 3.5,
  },
  objects,
  connections,
};

const validation = validateProjectData(projectData);
check(validation.isValid === true, 'ProjectData passes validation');
check(validation.errors.length === 0, 'Zero validation errors');

const serializedJson = JSON.stringify(projectData, null, 2);
check(serializedJson.length > 500, 'Serialized JSON string length > 500 bytes');

const parseRes = validateProjectJsonString(serializedJson);
check(parseRes.isValid === true, 'validateProjectJsonString returns isValid: true');
check(parseRes.project !== undefined, 'Restored project is defined');

const restored = parseRes.project!;
check(restored.metadata.name === 'Polished Multi-Chamber Sump Test', 'Project name preserved');
check(restored.objects.length === 7, 'All 7 objects preserved');
check(restored.connections.length === 2, 'Both connections preserved');
check(restored.viewportSettings.explodedView === true, 'Exploded view setting preserved');
check(restored.viewportSettings.containerViewMode === 'cutaway', 'Cutaway container mode preserved');

// Verify Exploded View coordinate properties
for (const obj of restored.objects) {
  if (obj.componentType === 'internal-divider') {
    check(obj.position.x === -0.4, 'Baffle X coordinate preserved');
  } else if (obj.componentType === 'ceramic-bio-rings') {
    check(obj.position.y === -0.32, 'Ceramic rings Y floor coordinate preserved');
  } else if (obj.componentType === 'submersible-pump') {
    check(obj.parameters?.flowRate === 1500, 'Pump flow rate preserved');
  }
}

console.log(`\n======================================================`);
console.log(`Workflow & Polish Audit Results: ${passedTests}/${totalTests} tests passed successfully.`);
console.log(`======================================================\n`);
