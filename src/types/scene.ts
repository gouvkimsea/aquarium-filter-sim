export type CameraPreset = 'default' | 'top' | 'front' | 'side' | 'filter-closeup';

export interface SceneSettings {
  wireframe: boolean;
  lightingPreset: 'daylight' | 'actinic' | 'night';
  showHelpers: boolean;
  waterOpacity: number;
  cameraPreset: CameraPreset;
}

export interface WebGLDiagnosticInfo {
  isSupported: boolean;
  version?: string;
  vendor?: string;
  renderer?: string;
  errorMessage?: string;
}
