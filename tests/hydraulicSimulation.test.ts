/**
 * Hydraulic Simulation Automated Test Suite
 * 
 * Verifies:
 * 1. Simple connected pipe flow & operating point intersection.
 * 2. Resistance penalties (minor elbow losses, diameter restrictions, porous media).
 * 3. Static elevation lift and dead-headed pump conditions (H_static >= H_max).
 * 4. Explicit disconnected network & dead-end detection.
 * 5. Parallel branch flow distribution & mass conservation.
 * 6. Graceful reporting of unsolved multi-pump topologies.
 * 7. Comprehensive engineering assumptions and illustrative estimates.
 */

import { simulateHydraulics } from '../src/simulation/hydraulic/hydraulicEngine';
import { createConnectionEdge } from '../src/utils/connectionGraph';
import type { EditorObject, ConnectionEdge } from '../src/types/editor';

console.log('=== AQUARIUM FILTER SIMULATOR: HYDRAULIC SIMULATION TEST SUITE ===\n');

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

// ============================================================================
// BASELINE COMPONENTS HELPER
// ============================================================================

function createTestPump(overrides?: Partial<EditorObject>): EditorObject {
  return {
    id: 'pump_main',
    name: 'Submersible Return Pump',
    category: 'filter',
    componentType: 'submersible-pump',
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    dimensions: { x: 0.8, y: 0.8, z: 0.6 },
    material: { color: '#0f172a', opacity: 1, roughness: 0.3, metalness: 0.2, wireframe: false, transparent: false },
    parameters: {
      flowRate: 1000,    // 1000 L/h rated Q_max
      headHeight: 2.0,    // 2.0 m shut-off H_max
      wattage: 20,
    },
    ...overrides,
  };
}

function createTestPipe(id: string, lengthM: number = 1.0, diameterMm: number = 20, yPos: number = 0.5): EditorObject {
  return {
    id,
    name: `Pipe ${id}`,
    category: 'plumbing',
    componentType: 'straight-pipe',
    visible: true,
    position: { x: 0, y: yPos, z: 0 },
    dimensions: { x: diameterMm / 100, y: lengthM, z: diameterMm / 100 },
    material: { color: '#64748b', opacity: 1, roughness: 0.2, metalness: 0.2, wireframe: false, transparent: false },
    parameters: {
      diameterMm,
      length: lengthM,
    },
  };
}

function createTestElbow(id: string, diameterMm: number = 20, yPos: number = 1.0): EditorObject {
  return {
    id,
    name: `90° Elbow ${id}`,
    category: 'plumbing',
    componentType: 'elbow-pipe',
    visible: true,
    position: { x: 0.2, y: yPos, z: 0 },
    dimensions: { x: 0.4, y: 0.4, z: 0.2 },
    material: { color: '#334155', opacity: 1, roughness: 0.2, metalness: 0.2, wireframe: false, transparent: false },
    parameters: {
      diameterMm,
      angleDegrees: 90,
    },
  };
}

function createTestOutlet(id: string = 'outlet_main', yPos: number = 1.2): EditorObject {
  return {
    id,
    name: 'Lily Pipe Outlet',
    category: 'plumbing',
    componentType: 'water-outlet',
    visible: true,
    position: { x: 0, y: yPos, z: 0 },
    dimensions: { x: 0.4, y: 0.8, z: 0.3 },
    material: { color: '#38bdf8', opacity: 0.6, roughness: 0.1, metalness: 0.1, wireframe: false, transparent: true },
    parameters: {
      diameterMm: 16,
    },
  };
}

function createTestMedia(id: string = 'media_sponge', yPos: number = 0.3): EditorObject {
  return {
    id,
    name: 'Coarse Sponge (20 PPI)',
    category: 'media',
    componentType: 'coarse-sponge',
    visible: true,
    position: { x: 0, y: yPos, z: 0 },
    dimensions: { x: 0.1, y: 0.3, z: 0.3 },
    material: { color: '#1d4ed8', opacity: 0.9, roughness: 0.9, metalness: 0.0, wireframe: false, transparent: false },
    parameters: {
      ppi: 20,
    },
  };
}

// ============================================================================
// TEST SUITE 1: SIMPLE CONNECTED PIPE & PUMP OPERATING POINT
// ============================================================================
console.log('--- TEST SUITE 1: Simple Connected Pipe Flow ---');

const pump1 = createTestPump();
const pipe1 = createTestPipe('pipe_1', 1.5, 20, 0.75);
const outlet1 = createTestOutlet('outlet_1', 1.5);

const edge1 = createConnectionEdge(pump1.id, 'discharge', pipe1.id, 'port-a');
const edge2 = createConnectionEdge(pipe1.id, 'port-b', outlet1.id, 'coupling');

const res1 = simulateHydraulics([pump1, pipe1, outlet1], [edge1, edge2], { isOpenSump: false });

assert(res1.status === 'estimated', 'Simulation status is "estimated" (illustrative estimate)');
assert(res1.isEstimate === true, 'Simulation explicitly marks result as isEstimate: true');
assert(res1.operatingPoint !== undefined, 'Operating point successfully solved');
const op1 = res1.operatingPoint!;
assert(op1.flowRate.lph > 0, `Operating flow rate is positive (${op1.flowRate.lph} L/h)`);
assert(op1.flowRate.lph < 1000, `Operating flow rate (${op1.flowRate.lph} L/h) is strictly lower than rated max (1000 L/h) due to friction`);
assert(Math.abs(op1.pumpHeadSuppliedM - op1.totalDynamicHeadM) < 0.05, `Pump head supplied (${op1.pumpHeadSuppliedM} m) balances total dynamic head (${op1.totalDynamicHeadM} m)`);
assert(res1.paths.length === 1, 'Traced 1 main discharge flow path');
assert(res1.paths[0].segments.length === 2, 'Path contains 2 segments (pipe + outlet nozzle)');
assert(res1.paths[0].segments[0].velocityMs > 0, 'Pipe segment calculates realistic positive velocity');
assert(res1.paths[0].segments[0].reynoldsNumber > 0, 'Pipe segment calculates Reynolds number');
assert(res1.paths[0].segments[0].frictionFactor > 0, 'Pipe segment calculates Darcy friction factor');

// ============================================================================
// TEST SUITE 2: RESTRICTIONS & MINOR LOSSES COMPARISON
// ============================================================================
console.log('\n--- TEST SUITE 2: Flow Restrictions & Minor Losses ---');

// Case A: Adding 90° elbow
const elbow2 = createTestElbow('elbow_1', 20, 0.8);
const edgeElbow1 = createConnectionEdge(pump1.id, 'discharge', elbow2.id, 'socket-1');
const edgeElbow2 = createConnectionEdge(elbow2.id, 'socket-2', pipe1.id, 'port-a');
const edgeElbow3 = createConnectionEdge(pipe1.id, 'port-b', outlet1.id, 'coupling');

const resElbow = simulateHydraulics([pump1, elbow2, pipe1, outlet1], [edgeElbow1, edgeElbow2, edgeElbow3], { isOpenSump: false });
assert(resElbow.status === 'estimated', 'Elbow network solved successfully');
const opElbow = resElbow.operatingPoint!;
assert(opElbow.minorLossHeadM > op1.minorLossHeadM, `Adding 90° elbow increased minor head loss (${opElbow.minorLossHeadM.toFixed(4)} m vs baseline ${op1.minorLossHeadM.toFixed(4)} m)`);
assert(opElbow.flowRate.lph < op1.flowRate.lph, `Adding 90° elbow reduced flow rate (${opElbow.flowRate.lph} L/h vs baseline ${op1.flowRate.lph} L/h)`);

// Case B: Pipe diameter restriction (20mm -> 10mm)
const pipeNarrow = createTestPipe('pipe_narrow', 1.5, 10, 0.75); // 10mm narrow ID
const edgeNarrow1 = createConnectionEdge(pump1.id, 'discharge', pipeNarrow.id, 'port-a');
const edgeNarrow2 = createConnectionEdge(pipeNarrow.id, 'port-b', outlet1.id, 'coupling');

const resNarrow = simulateHydraulics([pump1, pipeNarrow, outlet1], [edgeNarrow1, edgeNarrow2], { isOpenSump: false });
const opNarrow = resNarrow.operatingPoint!;
assert(opNarrow.flowRate.lph < op1.flowRate.lph * 0.75, `Severe diameter restriction (10mm) reduced flow significantly (${opNarrow.flowRate.lph} L/h vs baseline ${op1.flowRate.lph} L/h)`);
assert(opNarrow.frictionHeadM > op1.frictionHeadM, `Narrow pipe dramatically increased friction head (${opNarrow.frictionHeadM.toFixed(4)} m vs baseline ${op1.frictionHeadM.toFixed(4)} m)`);

// Case C: Adding Porous Media Block (coarse sponge)
const mediaSponge = createTestMedia('media_sponge', 0.2);
const edgeMedia1 = createConnectionEdge(pump1.id, 'discharge', mediaSponge.id, 'media-in');
const edgeMedia2 = createConnectionEdge(mediaSponge.id, 'media-out', pipe1.id, 'port-a');
const edgeMedia3 = createConnectionEdge(pipe1.id, 'port-b', outlet1.id, 'coupling');

const resMedia = simulateHydraulics([pump1, mediaSponge, pipe1, outlet1], [edgeMedia1, edgeMedia2, edgeMedia3], { isOpenSump: false });
assert(resMedia.operatingPoint!.mediaLossHeadM > 0, `Porous media head loss calculated (${resMedia.operatingPoint!.mediaLossHeadM.toFixed(4)} m)`);
assert(resMedia.operatingPoint!.flowRate.lph < op1.flowRate.lph, `Media resistance reduced flow rate (${resMedia.operatingPoint!.flowRate.lph} L/h vs baseline ${op1.flowRate.lph} L/h)`);

// ============================================================================
// TEST SUITE 3: STATIC ELEVATION HEAD & DEAD-HEAD CONDITIONS
// ============================================================================
console.log('\n--- TEST SUITE 3: Static Head & Dead-Head Conditions ---');

// Case A: Elevation within pump capacity (0.8m lift < 2.0m max head)
const outletElevated = createTestOutlet('outlet_elevated', 0.8);
const edgeElev1 = createConnectionEdge(pump1.id, 'discharge', pipe1.id, 'port-a');
const edgeElev2 = createConnectionEdge(pipe1.id, 'port-b', outletElevated.id, 'coupling');

const resElev = simulateHydraulics([pump1, pipe1, outletElevated], [edgeElev1, edgeElev2], { isOpenSump: true });
assert(resElev.operatingPoint!.staticHeadM === 0.8, 'Static head equals vertical elevation (0.8 m)');
assert(resElev.operatingPoint!.flowRate.lph < op1.flowRate.lph, `Elevated outlet reduced flow rate (${resElev.operatingPoint!.flowRate.lph} L/h vs siphon ${op1.flowRate.lph} L/h)`);

// Case B: Elevation exceeds shut-off head (2.5m lift > 2.0m max head)
const outletTooHigh = createTestOutlet('outlet_too_high', 2.5); // 2.5m > 2.0m pump shutoff
const edgeTooHigh1 = createConnectionEdge(pump1.id, 'discharge', pipe1.id, 'port-a');
const edgeTooHigh2 = createConnectionEdge(pipe1.id, 'port-b', outletTooHigh.id, 'coupling');

const resDeadHead = simulateHydraulics([pump1, pipe1, outletTooHigh], [edgeTooHigh1, edgeTooHigh2], { isOpenSump: true });
assert(resDeadHead.status === 'pump-dead-headed', 'Status explicitly flagged as "pump-dead-headed"');
assert(resDeadHead.operatingPoint!.flowRate.lph === 0, 'Dead-headed pump produces strictly 0 L/h flow');
assert(resDeadHead.warnings.some((w) => w.includes('exceeds pump shut-off head')), 'Warning clearly explains static lift exceeded shut-off head');

// ============================================================================
// TEST SUITE 4: DISCONNECTED PATHS & DEAD-END NETWORKS
// ============================================================================
console.log('\n--- TEST SUITE 4: Disconnected Paths & Dead Ends ---');

// Case A: Pump with open discharge (zero connected pipes)
const resOpenPump = simulateHydraulics([pump1], []);
assert(resOpenPump.status === 'disconnected', 'Open pump discharge flagged as "disconnected"');
assert(resOpenPump.operatingPoint === undefined, 'No fictitious operating point invented for disconnected pump');
assert(resOpenPump.warnings.some((w) => w.includes('has no connected plumbing')), 'Warning highlights unconnected discharge port');

// Case B: Pipe connected to pump but ends in a dead-end (no outlet)
const resDeadEnd = simulateHydraulics([pump1, pipe1], [edge1]);
assert(resDeadEnd.status === 'dead-end', 'Pipe terminating without outlet flagged as "dead-end"');
assert(resDeadEnd.unsolvedReasons.some((r) => r.includes('terminates')), 'Unsolved reason clearly identifies dead end component');

// Case C: Scene with no pump
const resNoPump = simulateHydraulics([pipe1, outlet1], [edge2]);
assert(resNoPump.status === 'no-pump', 'Scene without pump flagged as "no-pump"');
assert(resNoPump.warnings.some((w) => w.includes('Add a Submersible Pump')), 'Warning guides user to add a pump');

// ============================================================================
// TEST SUITE 5: PARALLEL BRANCHES & FLOW DISTRIBUTION
// ============================================================================
console.log('\n--- TEST SUITE 5: Parallel Branches & Mass Conservation ---');

// Pump splits into 2 symmetric parallel pipes, each going to an outlet
const pipeBranchA = createTestPipe('pipe_branch_a', 1.0, 20, 0.5);
const pipeBranchB = createTestPipe('pipe_branch_b', 1.0, 20, 0.5);
const outletBranchA = createTestOutlet('outlet_branch_a', 1.0);
const outletBranchB = createTestOutlet('outlet_branch_b', 1.0);

const edgeSplitA = createConnectionEdge(pump1.id, 'discharge', pipeBranchA.id, 'port-a');
const edgeSplitB = createConnectionEdge(pump1.id, 'discharge', pipeBranchB.id, 'port-a');
const edgeExitA = createConnectionEdge(pipeBranchA.id, 'port-b', outletBranchA.id, 'coupling');
const edgeExitB = createConnectionEdge(pipeBranchB.id, 'port-b', outletBranchB.id, 'coupling');

const resParallel = simulateHydraulics(
  [pump1, pipeBranchA, pipeBranchB, outletBranchA, outletBranchB],
  [edgeSplitA, edgeSplitB, edgeExitA, edgeExitB],
  { isOpenSump: false }
);

assert(resParallel.status === 'estimated', 'Parallel branch network solved successfully');
assert(resParallel.parallelBranches !== undefined, 'Parallel branches array populated');
assert(resParallel.parallelBranches?.length === 2, 'Detected exactly 2 parallel branches');

const bA = resParallel.parallelBranches![0];
const bB = resParallel.parallelBranches![1];
const totalQ = resParallel.operatingPoint!.flowRate.lph;
const sumBranchQ = bA.flowRate.lph + bB.flowRate.lph;

assert(Math.abs(sumBranchQ - totalQ) < 1.0, `Mass conservation satisfied: sum of branches (${sumBranchQ} L/h) = total (${totalQ} L/h)`);
assert(Math.abs(bA.flowFraction - 0.5) < 0.05, `Symmetric branch A receives ~50% flow fraction (${(bA.flowFraction * 100).toFixed(1)}%)`);
assert(Math.abs(bB.flowFraction - 0.5) < 0.05, `Symmetric branch B receives ~50% flow fraction (${(bB.flowFraction * 100).toFixed(1)}%)`);
assert(Math.abs(bA.headLossM - bB.headLossM) < 0.01, `Head loss is equalized across both branches (${bA.headLossM.toFixed(4)} m vs ${bB.headLossM.toFixed(4)} m)`);

// Case B: Asymmetric branches (Branch A is short 0.5m, Branch B is long 3.0m)
const pipeShort = createTestPipe('pipe_short', 0.5, 20, 0.5);
const pipeLong = createTestPipe('pipe_long', 3.0, 20, 0.5);
const edgeAsymA = createConnectionEdge(pump1.id, 'discharge', pipeShort.id, 'port-a');
const edgeAsymB = createConnectionEdge(pump1.id, 'discharge', pipeLong.id, 'port-a');
const edgeAsymExitA = createConnectionEdge(pipeShort.id, 'port-b', outletBranchA.id, 'coupling');
const edgeAsymExitB = createConnectionEdge(pipeLong.id, 'port-b', outletBranchB.id, 'coupling');

const resAsym = simulateHydraulics(
  [pump1, pipeShort, pipeLong, outletBranchA, outletBranchB],
  [edgeAsymA, edgeAsymB, edgeAsymExitA, edgeAsymExitB],
  { isOpenSump: false }
);

const bShort = resAsym.parallelBranches![0];
const bLong = resAsym.parallelBranches![1];
assert(bShort.flowRate.lph > bLong.flowRate.lph, `Shorter pipe branch receives higher flow rate (${bShort.flowRate.lph} L/h > ${bLong.flowRate.lph} L/h)`);

// ============================================================================
// TEST SUITE 6: UNSOLVED CASES & EXPLICIT DIAGNOSTICS
// ============================================================================
console.log('\n--- TEST SUITE 6: Unsolved Cases & Explicit Diagnostics ---');

// Case A: Multiple competing pumps in network
const pump2 = createTestPump({ id: 'pump_secondary', name: 'Auxiliary Return Pump' });
const resMultiPump = simulateHydraulics([pump1, pump2, pipe1, outlet1], [edge1, edge2]);
assert(resMultiPump.status === 'unsolved', 'Multiple pumps flagged as "unsolved"');
assert(resMultiPump.unsolvedReasons.some((r) => r.includes('Multiple pumps')), 'Explicit reason explains Hardy-Cross requirement rather than inventing numbers');

// Case B: Closed loop with no outlet
const pipeLoopA = createTestPipe('loop_a', 1.0, 20, 0.5);
const pipeLoopB = createTestPipe('loop_b', 1.0, 20, 0.5);
const edgeL1 = createConnectionEdge(pump1.id, 'discharge', pipeLoopA.id, 'port-a');
const edgeL2 = createConnectionEdge(pipeLoopA.id, 'port-b', pipeLoopB.id, 'port-a');
const edgeL3 = createConnectionEdge(pipeLoopB.id, 'port-b', pump1.id, 'discharge'); // circular loop

const resLoop = simulateHydraulics([pump1, pipeLoopA, pipeLoopB], [edgeL1, edgeL2, edgeL3]);
assert(resLoop.status === 'invalid-network', 'Closed loop without outlet flagged as "invalid-network"');

// ============================================================================
// TEST SUITE 7: CALCULATION ASSUMPTIONS & STRUCTURED METADATA
// ============================================================================
console.log('\n--- TEST SUITE 7: Calculation Assumptions & Documentation ---');

assert(res1.assumptions.length >= 4, 'Result contains at least 4 detailed engineering assumptions');
assert(res1.assumptions.some((a) => a.includes('Darcy-Weisbach')), 'Assumptions document Darcy-Weisbach friction formula');
assert(res1.assumptions.some((a) => a.includes('parabolic model')), 'Assumptions document parabolic centrifugal pump curve approximation');
assert(res1.diagnostics.pipeCount === 1, 'Diagnostics track pipe component count');
assert(res1.diagnostics.pumpCount === 1, 'Diagnostics track pump count');
assert(res1.diagnostics.totalSystemLengthM > 0, 'Diagnostics track total system physical length');

console.log(`\n======================================================`);
console.log(`Results: ${passedTests}/${totalTests} tests passed successfully.`);
console.log(`======================================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
