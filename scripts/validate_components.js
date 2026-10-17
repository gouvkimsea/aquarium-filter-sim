import fs from 'fs';

console.log('--- VALIDATING 12 REUSABLE FILTER COMPONENTS ---');

const content = fs.readFileSync('src/data/componentLibrary.ts', 'utf-8');

const REQUIRED_COMPONENTS = [
  'filter-container',
  'internal-divider',
  'coarse-sponge',
  'fine-sponge',
  'filter-floss-pad',
  'ceramic-bio-rings',
  'bio-media-balls',
  'submersible-pump',
  'straight-pipe',
  'elbow-pipe',
  'flexible-hose',
  'water-inlet',
  'water-outlet',
];

let allPassed = true;

for (const comp of REQUIRED_COMPONENTS) {
  const match = content.includes(`componentType: '${comp}'`);
  if (match) {
    console.log(`[PASS] Component '${comp}' registered in COMPONENT_TEMPLATES.`);
  } else {
    console.error(`[FAIL] Component '${comp}' NOT FOUND in COMPONENT_TEMPLATES!`);
    allPassed = false;
  }
}

// Verify 3D meshes in FilterComponents.tsx
const meshContent = fs.readFileSync('src/components/canvas/components/FilterComponents.tsx', 'utf-8');

const REQUIRED_MESHES = [
  'FilterContainerMesh',
  'InternalDividerMesh',
  'CoarseSpongeMesh',
  'FineSpongeMesh',
  'FilterFlossPadMesh',
  'CeramicBioRingsMesh',
  'BioBallsMesh',
  'SubmersiblePumpMesh',
  'StraightPipeMesh',
  'ElbowPipeMesh',
  'FlexibleHoseMesh',
  'WaterInletMesh',
  'WaterOutletMesh',
  'ReusableFilterMesh',
];

for (const mesh of REQUIRED_MESHES) {
  if (meshContent.includes(`export const ${mesh}`)) {
    console.log(`[PASS] 3D Mesh component '${mesh}' exported.`);
  } else {
    console.error(`[FAIL] 3D Mesh component '${mesh}' missing in FilterComponents.tsx!`);
    allPassed = false;
  }
}

// Verify Scene.tsx imports ReusableFilterMesh
const sceneContent = fs.readFileSync('src/components/canvas/Scene.tsx', 'utf-8');
if (sceneContent.includes('ReusableFilterMesh')) {
  console.log('[PASS] Scene.tsx integrates ReusableFilterMesh for dynamic objects.');
} else {
  console.error('[FAIL] Scene.tsx does not integrate ReusableFilterMesh!');
  allPassed = false;
}

// Verify LeftSidebar.tsx has drag-and-drop
const sidebarContent = fs.readFileSync('src/components/sidebar/LeftSidebar.tsx', 'utf-8');
if (sidebarContent.includes('draggable={true}') && sidebarContent.includes('handleDragStart')) {
  console.log('[PASS] LeftSidebar.tsx implements drag-and-drop on component cards.');
} else {
  console.error('[FAIL] LeftSidebar.tsx missing drag-and-drop implementation!');
  allPassed = false;
}

// Verify AquariumViewport.tsx has onDragOver and onDrop
const viewportContent = fs.readFileSync('src/components/canvas/AquariumViewport.tsx', 'utf-8');
if (viewportContent.includes('onDragOver') && viewportContent.includes('onDrop') && viewportContent.includes('viewport-drop-overlay')) {
  console.log('[PASS] AquariumViewport.tsx implements 3D dropzone and onDrop handler.');
} else {
  console.error('[FAIL] AquariumViewport.tsx missing dropzone implementation!');
  allPassed = false;
}

if (allPassed) {
  console.log('--- ALL 12 REUSABLE FILTER COMPONENTS VALIDATED SUCCESSFULLY ---');
  process.exit(0);
} else {
  process.exit(1);
}
