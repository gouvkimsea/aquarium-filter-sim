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

export interface ViewportSettings {
  viewMode: ViewMode;
  cameraPreset: CameraPreset;
  lightingPreset: LightingPreset;
  showGrid: boolean;
  showMeasurements: boolean;
  showHelpers: boolean;
  unitSystem: UnitSystem;
}

export interface LayoutSettings {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  activeLeftTab: 'library' | 'outliner';
}
