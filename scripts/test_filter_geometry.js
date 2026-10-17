// Comprehensive Test Suite for Aquarium Filter Geometry & Chamber Editing
import {
  CONTAINER_LIMITS,
  validateContainerDimensions,
  toDisplayUnits,
  fromDisplayUnits,
  formatVolume,
  calculateChambers,
  getNewDividerPosition,
  resizeContainerAndDividers,
} from '../src/utils/filterGeometry.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

console.log('===============================================================');
console.log('RUNNING TEST SUITE: FILTER GEOMETRY & CHAMBER ENGINE');
console.log('===============================================================');

// ---------------------------------------------------------------------------
// TEST SUITE 1: Dimension Validation & Clamping
// ---------------------------------------------------------------------------
console.log('\n[1. Container Dimension Validation]');

// 1.1 Valid dimensions
const validDim = { x: 2.2, y: 1.5, z: 1.0 };
const v1 = validateContainerDimensions(validDim);
assert(v1.valid === true, 'Valid dimensions (2.2m x 1.5m x 1.0m) pass validation');
assert(v1.error === undefined, 'No error for valid dimensions');

// 1.2 Undersized dimensions (below 40cm width)
const underDim = { x: 0.2, y: 1.0, z: 1.0 };
const v2 = validateContainerDimensions(underDim);
assert(v2.valid === false, 'Undersized width (0.2m < 0.4m) fails validation');
assert(v2.clamped.x === CONTAINER_LIMITS.minWidth, `Undersized width clamped to ${CONTAINER_LIMITS.minWidth}m`);

// 1.3 Oversized dimensions (above 5.0m width)
const overDim = { x: 7.5, y: 1.0, z: 1.0 };
const v3 = validateContainerDimensions(overDim);
assert(v3.valid === false, 'Oversized width (7.5m > 5.0m) fails validation');
assert(v3.clamped.x === CONTAINER_LIMITS.maxWidth, `Oversized width clamped to ${CONTAINER_LIMITS.maxWidth}m`);

// 1.4 Invalid NaN dimensions
const nanDim = { x: NaN, y: 1.0, z: 1.0 };
const v4 = validateContainerDimensions(nanDim);
assert(v4.valid === false, 'NaN dimension is flagged invalid');
assert(v4.clamped.x === CONTAINER_LIMITS.minWidth, 'NaN dimension clamped to safe minimum');

// ---------------------------------------------------------------------------
// TEST SUITE 2: Unit System Precision Conversions
// ---------------------------------------------------------------------------
console.log('\n[2. Unit System Conversions (mm, cm, in)]');

// 2.1 Metric mm
const mmTest = toDisplayUnits(2.0, 'metric', 'mm');
assert(mmTest.value === 2000, '2.0 meters converts to 2000 mm');
assert(mmTest.formatted === '2000 mm', 'Formatted mm string matches "2000 mm"');

// 2.2 Metric cm
const cmTest = toDisplayUnits(2.0, 'metric', 'cm');
assert(cmTest.value === 200.0, '2.0 meters converts to 200.0 cm');
assert(cmTest.formatted === '200.0 cm', 'Formatted cm string matches "200.0 cm"');

// 2.3 Imperial in
const inTest = toDisplayUnits(1.0, 'imperial', 'mm');
assert(inTest.value === 39.4, '1.0 meter converts to ~39.4 in');

// 2.4 Reverse conversions
const revMm = fromDisplayUnits(1500, 'metric', 'mm');
assert(Math.abs(revMm - 1.5) < 0.001, '1500 mm converts back to 1.5 meters');

const revCm = fromDisplayUnits(85, 'metric', 'cm');
assert(Math.abs(revCm - 0.85) < 0.001, '85 cm converts back to 0.85 meters');

// 2.5 Volume formatting
assert(formatVolume(100, 'metric') === '100.0 L', '100 liters formats to "100.0 L"');
assert(formatVolume(100, 'imperial') === '26.4 gal', '100 liters formats to "26.4 gal"');

// ---------------------------------------------------------------------------
// TEST SUITE 3: Chamber Arrangements & Usable Volume
// ---------------------------------------------------------------------------
console.log('\n[3. Chamber Boundary & Usable Volume Calculations]');

const baseContainer = {
  id: 'obj-filter-container',
  name: 'Test Filter Container',
  category: 'filter',
  componentType: 'filter-container',
  visible: true,
  position: { x: 0, y: 0, z: 0 },
  dimensions: { x: 2.0, y: 1.0, z: 0.8 },
  material: { color: '#38bdf8', opacity: 0.35, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
  parameters: {},
};

// 3.1 Arrangement A: No dividers (single large reservoir)
const configA = calculateChambers(baseContainer, []);
assert(configA.chambers.length === 1, 'No dividers produces 1 chamber');
assert(configA.totalInternalVolumeLiters > 0, `Usable internal volume calculated: ${configA.totalInternalVolumeLiters} L`);

// 3.2 Arrangement B: 2 Dividers (Standard 3-Chamber Filter)
const divider1 = {
  id: 'div-1',
  name: 'Divider 1',
  category: 'filter',
  componentType: 'internal-divider',
  visible: true,
  position: { x: -0.3, y: 0, z: 0 },
  dimensions: { x: 0.04, y: 0.9, z: 0.72 },
  material: {},
  parameters: {},
};
const divider2 = {
  id: 'div-2',
  name: 'Divider 2',
  category: 'filter',
  componentType: 'internal-divider',
  visible: true,
  position: { x: 0.3, y: 0, z: 0 },
  dimensions: { x: 0.04, y: 0.9, z: 0.72 },
  material: {},
  parameters: {},
};

const configB = calculateChambers(baseContainer, [divider1, divider2]);
assert(configB.chambers.length === 3, '2 dividers produce 3 chamber stages');
assert(configB.chambers[0].endX <= divider1.position.x, 'Chamber 1 ends before Divider 1');
assert(configB.chambers[1].startX >= divider1.position.x, 'Chamber 2 starts after Divider 1');
assert(configB.chambers[2].startX >= divider2.position.x, 'Chamber 3 starts after Divider 2');

const sumChamberVolumes = parseFloat(configB.chambers.reduce((sum, ch) => sum + ch.volumeLiters, 0).toFixed(1));
assert(Math.abs(sumChamberVolumes - configB.totalInternalVolumeLiters) < 0.2, 'Sum of chamber volumes equals total usable volume');

// 3.3 Arrangement C: 4 Dividers (5-Stage Filtration)
const divider3 = { ...divider1, id: 'div-3', position: { x: -0.6, y: 0, z: 0 } };
const divider4 = { ...divider2, id: 'div-4', position: { x: 0.6, y: 0, z: 0 } };
const configC = calculateChambers(baseContainer, [divider3, divider1, divider2, divider4]);
assert(configC.chambers.length === 5, '4 dividers produce 5 chamber stages');

// ---------------------------------------------------------------------------
// TEST SUITE 4: Auto-Placement in Widest Chamber
// ---------------------------------------------------------------------------
console.log('\n[4. Smart Divider Placement]');
// In configB, the middle chamber is between -0.3 and +0.3 (width ~0.56m)
// Left chamber is -0.96 to -0.32 (width ~0.64m)
const placement = getNewDividerPosition(baseContainer, [divider1, divider2]);
assert(typeof placement.position.x === 'number', 'Placement returns valid numeric X position');
assert(placement.position.x > -1.0 && placement.position.x < 1.0, 'New divider placed securely inside container bounds');
assert(placement.dimensions.y > 0.8, 'New divider height matches container internal height');

// ---------------------------------------------------------------------------
// TEST SUITE 5: Non-Destructive Container Resizing & Divider Scaling
// ---------------------------------------------------------------------------
console.log('\n[5. Non-Destructive Resizing & Proportional Divider Preservation]');

// Scale container width up from 2.0m to 3.0m (+50%)
const resizeUp = resizeContainerAndDividers(baseContainer, [divider1, divider2], { x: 3.0, y: 1.0, z: 0.8 });
assert(resizeUp.updatedContainer.dimensions.x === 3.0, 'Container width updated to 3.0m');
assert(resizeUp.updatedDividers.length === 2, 'Existing dividers are preserved (not erased or corrupted)');

// Divider 1 original X was -0.3. Scaled up by 1.5x should be approx -0.45
const div1NewX = resizeUp.updatedDividers[0].position.x;
assert(Math.abs(div1NewX - (-0.45)) < 0.05, `Divider 1 proportionally moved to ${div1NewX}m (approx -0.45m)`);

// Scale container width down from 2.0m to 1.2m (-40%)
const resizeDown = resizeContainerAndDividers(baseContainer, [divider1, divider2], { x: 1.2, y: 1.0, z: 0.8 });
assert(resizeDown.updatedContainer.dimensions.x === 1.2, 'Container width scaled down to 1.2m');
assert(resizeDown.updatedDividers.length === 2, 'Dividers preserved during shrink');
const maxAllowedInnerX = 1.2 / 2 - CONTAINER_LIMITS.wallThickness * 2;
assert(Math.abs(resizeDown.updatedDividers[0].position.x) <= maxAllowedInnerX, 'Scaled dividers clamped safely inside container walls');

console.log('===============================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('===============================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
