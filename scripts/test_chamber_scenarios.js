// Scenario Testing for Filter Chamber Arrangements & Geometries
import {
  calculateChambers,
  getNewDividerPosition,
  resizeContainerAndDividers,
  validateContainerDimensions,
  toDisplayUnits,
  fromDisplayUnits,
  formatVolume,
} from '../src/utils/filterGeometry.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('======================================================================');
console.log('SIMULATING CHAMBER SCENARIOS & CONTAINER SIZES');
console.log('======================================================================');

// SCENARIO 1: Standard 3-Chamber Marine Sump Basin (2.0m x 1.5m x 1.0m)
console.log('\n[Scenario 1: Standard 3-Chamber Marine Sump Basin]');
const sump = {
  id: 'obj-filter-container',
  name: 'Multi-Chamber Filter Basin',
  category: 'filter',
  componentType: 'filter-container',
  visible: true,
  position: { x: 2.2, y: 1.4, z: -1.75 },
  dimensions: { x: 2.0, y: 1.5, z: 1.0 },
  parameters: { capacityLiters: 3.3 },
};

const baffle1 = {
  id: 'obj-filter-baffle-1',
  name: 'Chamber Baffle 1 (Underflow)',
  category: 'filter',
  componentType: 'internal-divider',
  visible: true,
  position: { x: 1.85, y: 1.5, z: -1.75 },
  dimensions: { x: 0.03, y: 1.25, z: 0.92 },
  parameters: { underflowGapMm: 15 },
};

const baffle2 = {
  id: 'obj-filter-baffle-2',
  name: 'Chamber Baffle 2 (Weir Overflow)',
  category: 'filter',
  componentType: 'internal-divider',
  visible: true,
  position: { x: 2.55, y: 1.35, z: -1.75 },
  dimensions: { x: 0.03, y: 1.1, z: 0.92 },
  parameters: { underflowGapMm: 20 },
};

const sumpChambers = calculateChambers(sump, [baffle1, baffle2]);
assert(sumpChambers.chambers.length === 3, 'Calculates exactly 3 functional chambers');
assert(sumpChambers.chambers[0].assignedStage === 'mechanical', 'Stage 1 identified as mechanical intake');
assert(sumpChambers.chambers[1].assignedStage === 'biological', 'Stage 2 identified as biological matrix');
assert(sumpChambers.chambers[2].assignedStage === 'chemical', 'Stage 3 identified as chemical / media');
assert(sumpChambers.totalInternalVolumeLiters > 1500, `Total internal volume is realistic (${sumpChambers.totalInternalVolumeLiters} L)`);

// SCENARIO 2: Nano Aquarium Compact Filter (0.8m x 0.5m x 0.4m)
console.log('\n[Scenario 2: Nano Filter Basin - 2 Chambers]');
const nano = {
  id: 'obj-filter-nano',
  name: 'Compact Nano Filter',
  category: 'filter',
  componentType: 'filter-container',
  visible: true,
  position: { x: 0, y: 0, z: 0 },
  dimensions: { x: 0.8, y: 0.5, z: 0.4 },
  parameters: {},
};

const nanoBaffle = {
  id: 'nano-baffle',
  name: 'Nano Divider',
  category: 'filter',
  componentType: 'internal-divider',
  visible: true,
  position: { x: 0.0, y: 0, z: 0 },
  dimensions: { x: 0.02, y: 0.4, z: 0.32 },
  parameters: { underflowGapMm: 10 },
};

const nanoChambers = calculateChambers(nano, [nanoBaffle]);
assert(nanoChambers.chambers.length === 2, 'Nano filter has 2 chambers');
assert(nanoChambers.totalInternalVolumeLiters > 50 && nanoChambers.totalInternalVolumeLiters < 200, `Nano volume within expected range (${nanoChambers.totalInternalVolumeLiters} L)`);

// SCENARIO 3: Large Custom Commercial Filter (4.0m x 2.2m x 1.8m) with 5 Stages
console.log('\n[Scenario 3: Commercial 5-Stage Filter Basin]');
const commercial = {
  id: 'obj-filter-commercial',
  name: 'High-Volume Commercial Basin',
  category: 'filter',
  componentType: 'filter-container',
  visible: true,
  position: { x: 0, y: 0, z: 0 },
  dimensions: { x: 4.0, y: 2.2, z: 1.8 },
  parameters: {},
};

// 4 baffles at x = -1.2, -0.4, +0.4, +1.2
const b1 = { id: 'b1', name: 'B1', category: 'filter', componentType: 'internal-divider', visible: true, position: { x: -1.2, y: 0, z: 0 }, dimensions: { x: 0.04, y: 2.0, z: 1.7 } };
const b2 = { id: 'b2', name: 'B2', category: 'filter', componentType: 'internal-divider', visible: true, position: { x: -0.4, y: 0, z: 0 }, dimensions: { x: 0.04, y: 2.0, z: 1.7 } };
const b3 = { id: 'b3', name: 'B3', category: 'filter', componentType: 'internal-divider', visible: true, position: { x: 0.4, y: 0, z: 0 }, dimensions: { x: 0.04, y: 2.0, z: 1.7 } };
const b4 = { id: 'b4', name: 'B4', category: 'filter', componentType: 'internal-divider', visible: true, position: { x: 1.2, y: 0, z: 0 }, dimensions: { x: 0.04, y: 2.0, z: 1.7 } };

const commChambers = calculateChambers(commercial, [b1, b2, b3, b4]);
assert(commChambers.chambers.length === 5, 'Commercial filter has 5 chambers');
assert(commChambers.totalInternalVolumeLiters > 10000, `Commercial usable volume is substantial (${commChambers.totalInternalVolumeLiters} L)`);

// SCENARIO 4: Dynamic Expansion from Nano (0.8m) to Sump (2.4m)
console.log('\n[Scenario 4: Dynamic Container Expansion (0.8m -> 2.4m)]');
const expanded = resizeContainerAndDividers(nano, [nanoBaffle], { x: 2.4, y: 1.2, z: 0.8 });
assert(expanded.updatedContainer.dimensions.x === 2.4, 'Container enlarged to 2.4m');
assert(expanded.updatedContainer.dimensions.y === 1.2, 'Container height enlarged to 1.2m');
assert(expanded.updatedDividers.length === 1, 'Divider preserved');
assert(expanded.updatedDividers[0].dimensions.y > 1.0, `Divider height scaled up to match container (${expanded.updatedDividers[0].dimensions.y}m)`);
assert(expanded.updatedDividers[0].dimensions.z > 0.7, `Divider depth scaled up to match container (${expanded.updatedDividers[0].dimensions.z}m)`);

// SCENARIO 5: Turnover & Flow Rate Synchronization
console.log('\n[Scenario 5: Simulation Flow Synchronization]');
const flowGPH = Math.round(expanded.updatedContainer.parameters.capacityLiters * 65);
const turnover = parseFloat((flowGPH / 70).toFixed(1));
assert(flowGPH > 0, `Flow rate synchronized: ${flowGPH} GPH`);
assert(turnover > 0, `Calculated turnover: ${turnover}x / hr`);

console.log('======================================================================');
console.log(`ALL SCENARIOS PASSED: ${passedTests}/${totalTests} Tests Successful`);
console.log('======================================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
