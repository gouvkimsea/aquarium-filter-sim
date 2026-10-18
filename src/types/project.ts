import type {
  EditorObject,
  ViewportSettings,
  SimulationState,
  ConnectionEdge,
} from './editor';

export const CURRENT_PROJECT_SCHEMA_VERSION = 1;
export const CURRENT_PROJECT_APP_VERSION = '1.0.0';

export interface ProjectMetadata {
  id: string;
  name: string;
  version: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  description?: string;
  author?: string;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  viewportSettings: ViewportSettings;
  simulation: SimulationState;
  objects: EditorObject[];
  connections: ConnectionEdge[];
}

export interface ProjectStorageItem {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  objectCount: number;
  connectionCount: number;
  data: ProjectData;
}

export interface ProjectValidationResult {
  isValid: boolean;
  project?: ProjectData;
  errors: string[];
  warnings: string[];
}
