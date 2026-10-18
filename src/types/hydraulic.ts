/**
 * Hydraulic Simulation Type Definitions
 * 
 * Defines structured data models for simplified 1D fluid dynamics,
 * friction head loss, minor fitting losses, pump curves, network flow paths,
 * and diagnostic simulation results.
 */

export type HydraulicStatus =
  | 'solved'              // Fully solved operating point with verified network
  | 'estimated'           // Solved using illustrative/nominal pump curve and standard pipe roughness
  | 'disconnected'        // Pump discharge or suction path has missing connections
  | 'dead-end'            // Flow path terminates at a dead end without reaching an outlet
  | 'no-pump'             // No active pump detected in the flow network
  | 'pump-dead-headed'    // Static lift or system resistance exceeds pump maximum shut-off head (flow = 0)
  | 'unsolved'            // Complex network topology (e.g. multi-pump loops) beyond simplified 1D solver
  | 'invalid-network';    // Corrupted geometry or cycle without outlet

export type FlowRegime = 'laminar' | 'transitional' | 'turbulent';

export interface FlowMeasurement {
  lph: number;     // Liters per hour (L/h)
  gph: number;     // Gallons per hour (GPH)
  m3s: number;     // Cubic meters per second (m³/s)
}

/**
 * Hydraulic performance characteristics of an individual conduit or fitting segment.
 */
export interface SegmentHydraulics {
  componentId: string;
  componentName: string;
  componentType: string;
  fromPortId: string;
  toPortId: string;
  lengthM: number;
  innerDiameterMm: number;
  velocityMs: number;
  reynoldsNumber: number;
  flowRegime: FlowRegime;
  frictionFactor: number;
  lossCoefficientK: number;
  frictionHeadLossM: number;
  minorHeadLossM: number;
  mediaHeadLossM: number;
  totalHeadLossM: number;
  elevationChangeM: number;
  isMedia: boolean;
  resistanceNote?: string;
}

/**
 * Solved parallel branch flow distribution.
 */
export interface ParallelBranchResult {
  branchIndex: number;
  branchName: string;
  segments: SegmentHydraulics[];
  flowRate: FlowMeasurement;
  flowFraction: number; // e.g. 0.50 (50% of total flow)
  headLossM: number;
  outletComponentId?: string;
}

/**
 * Traced flow path from suction source to discharge outlet.
 */
export interface FlowPathResult {
  pathId: string;
  type: 'suction' | 'discharge' | 'branch';
  startComponentId: string;
  endComponentId: string;
  segments: SegmentHydraulics[];
  totalLengthM: number;
  totalFrictionHeadM: number;
  totalMinorLossHeadM: number;
  totalMediaLossHeadM: number;
  totalStaticHeadM: number;
  totalDynamicHeadM: number;
}

/**
 * Pump hydraulic operating curve parameters.
 */
export interface PumpCurveModel {
  pumpId: string;
  pumpName: string;
  ratedMaxFlow: FlowMeasurement; // Q_max at zero head
  ratedMaxHeadM: number;         // H_max shut-off head
  wattage?: number;
  isNominalCurve: boolean;       // True if using standard parabolic approximation
  operatingFlowFraction?: number;// Q_op / Q_max
  operatingHeadFraction?: number;// H_op / H_max
}

/**
 * Configuration options for the hydraulic calculation engine.
 */
export interface HydraulicSimulationConfig {
  waterTemperatureC: number;     // Water temperature (default 25°C)
  pipeRoughnessMm: number;       // Absolute pipe wall roughness (default 0.0015 mm for PVC/acrylic)
  isOpenSump: boolean;           // True if static head equals vertical lift to outlet; false if siphon balanced
  gravityMss: number;            // Gravitational acceleration (default 9.80665 m/s²)
  enableMediaResistance: boolean;// Include Darcy flow resistance of foam/bio media
  assumeCleanMedia: boolean;     // True if clean media; false if clogged (+150% resistance)
}

/**
 * Complete structured results returned by the hydraulic simulation engine.
 */
export interface HydraulicSimulationResult {
  status: HydraulicStatus;
  isEstimate: boolean;
  operatingPoint?: {
    flowRate: FlowMeasurement;
    totalDynamicHeadM: number;
    staticHeadM: number;
    frictionHeadM: number;
    minorLossHeadM: number;
    mediaLossHeadM: number;
    pumpHeadSuppliedM: number;
  };
  pumpCurve?: PumpCurveModel;
  paths: FlowPathResult[];
  parallelBranches?: ParallelBranchResult[];
  warnings: string[];
  assumptions: string[];
  unsolvedReasons?: string[];
  diagnostics: {
    componentCount: number;
    pipeCount: number;
    elbowCount: number;
    pumpCount: number;
    inletCount: number;
    outletCount: number;
    mediaCount: number;
    totalSystemLengthM: number;
  };
}
