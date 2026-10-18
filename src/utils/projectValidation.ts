import type {
  ProjectData,
  ProjectMetadata,
  ProjectValidationResult,
} from '../types/project';
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  CURRENT_PROJECT_APP_VERSION,
} from '../types/project';
import type {
  EditorObject,
  ConnectionEdge,
  ViewportSettings,
  SimulationState,
} from '../types/editor';

export const DEFAULT_VIEWPORT: ViewportSettings = {
  viewMode: 'rendered',
  cameraPreset: 'isometric',
  lightingPreset: 'studio',
  showGrid: true,
  showMeasurements: true,
  showHelpers: false,
  unitSystem: 'imperial',
  metricUnit: 'mm',
  containerViewMode: 'transparent',
  explodedView: false,
};

export const DEFAULT_SIMULATION: SimulationState = {
  isRunning: true,
  speed: 1.0,
  elapsedSeconds: 0,
  simulatedMinutes: 14,
  totalFlowGPH: 150,
  calculatedTurnover: 2.1,
};

/**
 * Validates and migrates an arbitrary JSON object into a fully typed ProjectData object.
 * Gracefully handles legacy formats, missing fields, and unsupported versions.
 */
export function validateAndMigrateProject(raw: unknown): ProjectValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      errors: ['File is empty or does not contain a valid JSON object.'],
      warnings: [],
    };
  }

  const obj = raw as Record<string, any>;

  // Check Schema Version
  let schemaVer = obj.metadata?.schemaVersion || obj.schemaVersion || 1;
  if (typeof schemaVer !== 'number') {
    schemaVer = 1;
    warnings.push('Invalid or missing schemaVersion; defaulted to version 1.');
  }

  if (schemaVer > CURRENT_PROJECT_SCHEMA_VERSION) {
    warnings.push(
      `Project schema version (${schemaVer}) is newer than editor version (${CURRENT_PROJECT_SCHEMA_VERSION}). Some newer features may not display.`
    );
  }

  // 1. Validate / Synthesize Metadata
  let metadata: ProjectMetadata;
  if (obj.metadata && typeof obj.metadata === 'object') {
    metadata = {
      id: typeof obj.metadata.id === 'string' && obj.metadata.id.trim()
        ? obj.metadata.id
        : `proj_${Date.now()}`,
      name: typeof obj.metadata.name === 'string' && obj.metadata.name.trim()
        ? obj.metadata.name
        : 'Untitled Filter Project',
      version: obj.metadata.version || CURRENT_PROJECT_APP_VERSION,
      schemaVersion: schemaVer,
      createdAt: obj.metadata.createdAt || new Date().toISOString(),
      updatedAt: obj.metadata.updatedAt || new Date().toISOString(),
      description: obj.metadata.description || '',
      author: obj.metadata.author || '',
    };
  } else {
    // Migration: Legacy export file with top-level fields
    warnings.push('Legacy project format detected; migrated to versioned metadata.');
    metadata = {
      id: `proj_${Date.now()}`,
      name: typeof obj.project === 'string' ? obj.project : 'Imported Project',
      version: obj.version || CURRENT_PROJECT_APP_VERSION,
      schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      createdAt: obj.exportedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 2. Validate Objects Array
  const rawObjects = Array.isArray(obj.objects) ? obj.objects : [];
  if (!Array.isArray(obj.objects)) {
    errors.push('Project file is missing an "objects" array.');
  }

  const validObjects: EditorObject[] = [];
  const validObjectIds = new Set<string>();

  rawObjects.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      warnings.push(`Skipped malformed object entry at index ${index}.`);
      return;
    }

    const id = typeof item.id === 'string' && item.id.trim()
      ? item.id
      : `obj-${index}-${Date.now().toString(36)}`;

    const name = typeof item.name === 'string' ? item.name : `Object ${index + 1}`;
    const category = typeof item.category === 'string' ? item.category : 'filter';
    const componentType = typeof item.componentType === 'string' ? item.componentType : 'generic';

    // Fallbacks for geometry
    const position = {
      x: typeof item.position?.x === 'number' && !isNaN(item.position.x) ? item.position.x : 0,
      y: typeof item.position?.y === 'number' && !isNaN(item.position.y) ? item.position.y : 0,
      z: typeof item.position?.z === 'number' && !isNaN(item.position.z) ? item.position.z : 0,
    };

    const dimensions = {
      x: Math.max(0.01, typeof item.dimensions?.x === 'number' && !isNaN(item.dimensions.x) ? item.dimensions.x : 0.5),
      y: Math.max(0.01, typeof item.dimensions?.y === 'number' && !isNaN(item.dimensions.y) ? item.dimensions.y : 0.5),
      z: Math.max(0.01, typeof item.dimensions?.z === 'number' && !isNaN(item.dimensions.z) ? item.dimensions.z : 0.5),
    };

    const rotation = {
      x: typeof item.rotation?.x === 'number' && !isNaN(item.rotation.x) ? item.rotation.x : 0,
      y: typeof item.rotation?.y === 'number' && !isNaN(item.rotation.y) ? item.rotation.y : 0,
      z: typeof item.rotation?.z === 'number' && !isNaN(item.rotation.z) ? item.rotation.z : 0,
    };

    const material = {
      color: typeof item.material?.color === 'string' ? item.material.color : '#38bdf8',
      opacity: typeof item.material?.opacity === 'number' ? item.material.opacity : 1.0,
      roughness: typeof item.material?.roughness === 'number' ? item.material.roughness : 0.3,
      metalness: typeof item.material?.metalness === 'number' ? item.material.metalness : 0.2,
      wireframe: !!item.material?.wireframe,
      transparent: !!item.material?.transparent,
    };

    const parameters = item.parameters && typeof item.parameters === 'object' ? { ...item.parameters } : {};

    validObjects.push({
      id,
      name,
      category,
      componentType,
      visible: item.visible !== false,
      locked: !!item.locked,
      position,
      dimensions,
      rotation,
      material,
      parameters,
    });

    validObjectIds.add(id);
  });

  // 3. Validate Connections Array
  const rawConnections = Array.isArray(obj.connections) ? obj.connections : [];
  const validConnections: ConnectionEdge[] = [];

  rawConnections.forEach((edge, index) => {
    if (!edge || typeof edge !== 'object') {
      warnings.push(`Skipped malformed connection edge at index ${index}.`);
      return;
    }

    if (
      typeof edge.fromComponentId !== 'string' ||
      typeof edge.fromPortId !== 'string' ||
      typeof edge.toComponentId !== 'string' ||
      typeof edge.toPortId !== 'string'
    ) {
      warnings.push(`Skipped incomplete connection edge at index ${index}.`);
      return;
    }

    // Check if referenced objects exist
    if (!validObjectIds.has(edge.fromComponentId)) {
      warnings.push(`Connection edge references nonexistent component: "${edge.fromComponentId}".`);
      return;
    }
    if (!validObjectIds.has(edge.toComponentId)) {
      warnings.push(`Connection edge references nonexistent component: "${edge.toComponentId}".`);
      return;
    }

    const edgeId = typeof edge.id === 'string' && edge.id.trim()
      ? edge.id
      : `edge_${edge.fromComponentId}:${edge.fromPortId}__${edge.toComponentId}:${edge.toPortId}`;

    validConnections.push({
      id: edgeId,
      fromComponentId: edge.fromComponentId,
      fromPortId: edge.fromPortId,
      toComponentId: edge.toComponentId,
      toPortId: edge.toPortId,
      createdAt: typeof edge.createdAt === 'number' ? edge.createdAt : Date.now(),
    });
  });

  // 4. Validate Viewport & Simulation Settings with safe defaults
  const viewportSettings: ViewportSettings = {
    ...DEFAULT_VIEWPORT,
    ...(obj.viewportSettings && typeof obj.viewportSettings === 'object' ? obj.viewportSettings : {}),
  };

  const simulation: SimulationState = {
    ...DEFAULT_SIMULATION,
    ...(obj.simulation && typeof obj.simulation === 'object' ? obj.simulation : {}),
  };

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings,
    };
  }

  const project: ProjectData = {
    metadata,
    viewportSettings,
    simulation,
    objects: validObjects,
    connections: validConnections,
  };

  return {
    isValid: true,
    project,
    errors: [],
    warnings,
  };
}

/**
 * Validates a JSON string and parses/migrates it.
 */
export function validateProjectJsonString(jsonStr: string): ProjectValidationResult {
  try {
    const parsed = JSON.parse(jsonStr);
    return validateAndMigrateProject(parsed);
  } catch (err: any) {
    return {
      isValid: false,
      errors: [`JSON parse error: ${err?.message || 'Invalid JSON syntax'}`],
      warnings: [],
    };
  }
}

/**
 * Validates a project data object. Alias for validateAndMigrateProject.
 */
export function validateProjectData(data: unknown): ProjectValidationResult {
  return validateAndMigrateProject(data);
}

