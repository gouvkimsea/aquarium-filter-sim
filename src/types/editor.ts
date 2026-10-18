export type ObjectCategory =
  | 'structure'
  | 'water'
  | 'filter'
  | 'media'
  | 'plumbing'
  | 'aeration'
  | 'hardscape';

export type UnitSystem = 'metric' | 'imperial';
export type ViewMode = 'rendered' | 'wireframe' | 'xray';
export type CameraPreset =
  | 'isometric'
  | 'front'
  | 'top'
  | 'side'
  | 'left'
  | 'back'
  | 'filter-closeup';
export type LightingPreset = 'daylight' | 'studio' | 'actinic' | 'night';
export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface SnapSettings {
  enabled: boolean;
  translationSnap: number;
  rotationSnapDeg: number;
  scaleSnap: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type FilterComponentType =
  | 'filter-container'
  | 'internal-divider'
  | 'coarse-sponge'
  | 'fine-sponge'
  | 'filter-floss-pad'
  | 'ceramic-bio-rings'
  | 'bio-media-balls'
  | 'submersible-pump'
  | 'straight-pipe'
  | 'elbow-pipe'
  | 'flexible-hose'
  | 'water-inlet'
  | 'water-outlet'
  | 'generic';

export interface MaterialProperties {
  color: string;
  opacity: number;
  roughness: number;
  metalness: number;
  wireframe: boolean;
  transparent: boolean;
}

export interface EditorObject {
  id: string;
  name: string;
  category: ObjectCategory;
  componentType?: FilterComponentType;
  visible: boolean;
  locked?: boolean;
  position: Vector3D;
  dimensions: Vector3D; // length, height, width (in meters or units)
  rotation?: Vector3D;
  material: MaterialProperties;
  // Specific properties based on category
  parameters: Record<string, number | string | boolean>;
}

export interface ComponentTemplate {
  templateId: string;
  name: string;
  category: ObjectCategory;
  componentType?: FilterComponentType;
  description: string;
  iconName: string;
  defaultDimensions: Vector3D;
  defaultMaterial: MaterialProperties;
  defaultParameters: Record<string, number | string | boolean>;
  specsSummary: string;
}

export interface SimulationState {
  isRunning: boolean;
  speed: number; // 0.5, 1, 2, 5
  elapsedSeconds: number;
  simulatedMinutes: number;
  totalFlowGPH: number;
  calculatedTurnover: number;
}

export type ContainerViewMode = 'transparent' | 'opaque' | 'cutaway';
export type MetricUnit = 'mm' | 'cm';

export interface FilterChamberInfo {
  index: number;
  name: string;
  startX: number;
  endX: number;
  width: number; // in meters (internal)
  height: number;
  depth: number;
  volumeLiters: number;
  volumeGallons: number;
  assignedStage?: 'mechanical' | 'biological' | 'chemical' | 'pump' | 'intake';
}

export interface ContainerGeometryConfig {
  width: number; // in meters (internal)
  height: number;
  depth: number;
  wallThickness: number;
  bottomThickness: number;
  chambers: FilterChamberInfo[];
  totalInternalVolumeLiters: number;
  totalInternalVolumeGallons: number;
}

export interface ViewportSettings {
  viewMode: ViewMode;
  cameraPreset: CameraPreset;
  lightingPreset: LightingPreset;
  showGrid: boolean;
  showMeasurements: boolean;
  showHelpers: boolean;
  unitSystem: UnitSystem;
  metricUnit: MetricUnit;
  containerViewMode: ContainerViewMode;
}

export interface LayoutSettings {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  activeLeftTab: 'library' | 'outliner';
}

// =========================================================================
// CONNECTION GRAPH & PLUMBING PORTS
// =========================================================================

export type PortDirection = 'in' | 'out' | 'bidirectional';
export type PortType =
  | 'pipe'
  | 'elbow'
  | 'hose'
  | 'pump-discharge'
  | 'pump-suction'
  | 'inlet'
  | 'outlet'
  | 'chamber';

export interface ConnectionPort {
  id: string; // e.g. 'suction', 'discharge', 'port-a', 'port-b', 'socket-1', 'socket-2'
  name: string; // Human-friendly display label
  type: PortType;
  direction: PortDirection; // 'in' receives flow, 'out' sends flow, 'bidirectional'
  localOffset: Vector3D; // Local offset relative to object center
  normal: Vector3D; // Unit normal vector pointing outward
  diameterMm?: number;
}

export interface ConnectionEdge {
  id: string;
  fromComponentId: string;
  fromPortId: string;
  toComponentId: string;
  toPortId: string;
  createdAt: number;
}

export interface ConnectionGraph {
  edges: ConnectionEdge[];
}

export interface ConnectionIssue {
  type: 'disconnected-port' | 'invalid-type' | 'direction-mismatch' | 'orphan-edge';
  severity: 'error' | 'warning' | 'info';
  message: string;
  componentId: string;
  portId?: string;
}

export interface GraphAnalysis {
  isValid: boolean;
  connectedEdgeCount: number;
  openPortCount: number;
  connectedPortCount: number;
  issues: ConnectionIssue[];
  chains: string[][];
}
