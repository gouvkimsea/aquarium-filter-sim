import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  EditorObject,
  ComponentTemplate,
  SimulationState,
  ViewportSettings,
  LayoutSettings,
  TransformMode,
  SnapSettings,
  Vector3D,
  MetricUnit,
  ContainerViewMode,
  ConnectionEdge,
  GraphAnalysis,
} from '../types/editor';
import type {
  ProjectData,
  ProjectMetadata,
  ProjectStorageItem,
} from '../types/project';
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  CURRENT_PROJECT_APP_VERSION,
} from '../types/project';
import { INITIAL_SCENE_OBJECTS } from '../data/componentLibrary';
import {
  resizeContainerAndDividers,
  getNewDividerPosition,
} from '../utils/filterGeometry';
import {
  getComponentPorts,
  validateConnection,
  createConnectionEdge,
  findEdgeForPort,
  removeEdgesForComponent,
  updateConnectedPlumbing,
  analyzeConnectionGraph,
} from '../utils/connectionGraph';
import {
  saveProjectToStorage,
  getProjectFromStorage,
  listProjectsFromStorage,
  deleteProjectFromStorage,
  saveDraftToStorage,
  getDraftFromStorage,
  clearDraftFromStorage,
  setLastProjectId,
  getLastProjectId,
} from '../utils/projectStorage';
import { validateAndMigrateProject } from '../utils/projectValidation';
import { simulateHydraulics } from '../simulation/hydraulic/hydraulicEngine';
import type { HydraulicSimulationResult } from '../types/hydraulic';

export const INITIAL_CONNECTIONS: ConnectionEdge[] = [
  {
    id: 'edge_obj-filter-container:intake-chamber__obj-intake-pipe:coupling',
    fromComponentId: 'obj-intake-pipe',
    fromPortId: 'coupling',
    toComponentId: 'obj-filter-container',
    toPortId: 'intake-chamber',
    createdAt: 1729000000000,
  },
];

export const DEFAULT_PROJECT_METADATA: ProjectMetadata = {
  id: 'proj_default_sump',
  name: 'Multi-Chamber Filter Sump',
  version: CURRENT_PROJECT_APP_VERSION,
  schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  description: 'Multi-stage acrylic filter basin with biological media, submersible pump, and plumbing circuit.',
};

interface HistorySnapshot {
  objects: EditorObject[];
  connections: ConnectionEdge[];
}

interface EditorContextType {
  // Project Persistence & Management
  currentProject: ProjectMetadata;
  isDirty: boolean;
  setProjectName: (name: string) => void;
  newProject: (force?: boolean) => boolean;
  saveProject: () => Promise<boolean>;
  saveProjectAs: (name: string) => Promise<boolean>;
  openProject: (id: string, force?: boolean) => Promise<boolean>;
  exportProjectFile: () => void;
  importProjectFile: (file: File) => Promise<{ success: boolean; errors?: string[]; warnings?: string[] }>;
  listSavedProjects: () => Promise<ProjectStorageItem[]>;
  deleteSavedProject: (id: string) => Promise<void>;
  pendingUnsavedAction: (() => void) | null;
  setPendingUnsavedAction: (action: (() => void) | null) => void;
  executePendingUnsavedAction: () => void;
  clearPendingUnsavedAction: () => void;

  // Scene Objects & Selection
  objects: EditorObject[];
  selectedId: string | null;
  selectedObject: EditorObject | null;
  selectObject: (id: string | null) => void;
  deselectObject: () => void;
  updateObject: (id: string, updates: Partial<EditorObject>, skipHistory?: boolean) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  deleteObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  addComponentFromLibrary: (template: ComponentTemplate, dropPosition?: Vector3D) => void;

  // Connection Graph & Plumbing Ports
  connections: ConnectionEdge[];
  activeConnectingPort: { componentId: string; portId: string } | null;
  connectPorts: (
    fromComponentId: string,
    fromPortId: string,
    toComponentId: string,
    toPortId: string
  ) => { success: boolean; message?: string };
  disconnectPorts: (componentId: string, portId: string) => void;
  removeConnection: (edgeId: string) => void;
  startConnecting: (componentId: string, portId: string) => void;
  cancelConnecting: () => void;
  graphAnalysis: GraphAnalysis;
  hydraulicResult: HydraulicSimulationResult;

  // Transform Gizmo & Snapping
  transformMode: TransformMode;
  setTransformMode: (mode: TransformMode) => void;
  snapSettings: SnapSettings;
  setSnapSettings: (updater: (prev: SnapSettings) => SnapSettings) => void;
  toggleSnap: () => void;

  // History / Undo / Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Simulation Controls
  simulation: SimulationState;
  toggleSimulation: () => void;
  stepSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;
  resetSimulation: () => void;

  // Custom Filter Geometry & Chamber Editing
  resizeFilterContainer: (containerId: string, newDimensions: Vector3D) => void;
  addDividerToContainer: (containerId: string) => void;
  setMetricUnit: (unit: MetricUnit) => void;
  setContainerViewMode: (mode: ContainerViewMode) => void;

  // Viewport Settings
  viewportSettings: ViewportSettings;
  updateViewportSettings: (
    updater: (prev: ViewportSettings) => ViewportSettings
  ) => void;

  // Layout & Sidebars
  layoutSettings: LayoutSettings;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setActiveLeftTab: (tab: 'library' | 'outliner') => void;
  resetLayout: () => void;
  resetScene: () => void;
  exportProjectJSON: () => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

const MAX_HISTORY = 30;

export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [objects, setObjects] = useState<EditorObject[]>(INITIAL_SCENE_OBJECTS);
  const [selectedId, setSelectedId] = useState<string | null>('obj-filter-container');

  // Transform Mode ('translate' | 'rotate' | 'scale')
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');

  // Grid Snapping
  const [snapSettings, setSnapSettings] = useState<SnapSettings>({
    enabled: true,
    translationSnap: 0.1,
    rotationSnapDeg: 15,
    scaleSnap: 0.1,
  });

  // Project Persistence & State
  const [currentProject, setCurrentProject] = useState<ProjectMetadata>(DEFAULT_PROJECT_METADATA);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [pendingUnsavedAction, setPendingUnsavedAction] = useState<(() => void) | null>(null);

  // Connection Graph & Plumbing State
  const [connections, setConnections] = useState<ConnectionEdge[]>(INITIAL_CONNECTIONS);
  const [activeConnectingPort, setActiveConnectingPort] = useState<{
    componentId: string;
    portId: string;
  } | null>(null);

  // Undo / Redo history with full snapshot of objects and connection topology
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  // Simulation State
  const [simulation, setSimulation] = useState<SimulationState>({
    isRunning: true,
    speed: 1.0,
    elapsedSeconds: 0,
    simulatedMinutes: 14,
    totalFlowGPH: 150,
    calculatedTurnover: 2.1,
  });

  // Viewport Settings
  const [viewportSettings, setViewportSettings] = useState<ViewportSettings>({
    viewMode: 'rendered',
    cameraPreset: 'isometric',
    lightingPreset: 'studio',
    showGrid: true,
    showMeasurements: true,
    showHelpers: false,
    unitSystem: 'imperial',
    metricUnit: 'mm',
    containerViewMode: 'transparent',
  });

  // Layout & UI State
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>({
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    activeLeftTab: 'library',
  });

  // Helper to commit current state to undo history
  const pushHistory = useCallback(
    (currentObjects: EditorObject[], currentConnections: ConnectionEdge[]) => {
      setHistory((prev) => [
        ...prev.slice(-MAX_HISTORY),
        { objects: currentObjects, connections: currentConnections },
      ]);
      setFuture([]);
      setIsDirty(true);
    },
    []
  );

  // Calculate live turnover when filters change
  const totalFlowGPH = useMemo(() => {
    return objects
      .filter((obj) => obj.category === 'filter' && obj.visible)
      .reduce((acc, obj) => {
        const rate = (obj.parameters.flowRateGPH as number) || 0;
        const motorOn = obj.parameters.motorStatus !== false;
        return acc + (motorOn ? rate : 0);
      }, 0);
  }, [objects]);

  const calculatedTurnover = useMemo(() => {
    const tank = objects.find((o) => o.id === 'obj-tank-enclosure');
    const gal = (tank?.parameters.capacityGallons as number) || 71.3;
    return gal > 0 ? parseFloat((totalFlowGPH / gal).toFixed(2)) : 0;
  }, [objects, totalFlowGPH]);

  // Simulation tick loop
  useEffect(() => {
    if (!simulation.isRunning) return;

    const interval = setInterval(() => {
      setSimulation((prev) => ({
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + 1,
        simulatedMinutes: prev.simulatedMinutes + prev.speed * 0.5,
        totalFlowGPH,
        calculatedTurnover,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [simulation.isRunning, simulation.speed, totalFlowGPH, calculatedTurnover]);

  // Object Selection (Prevents selecting hidden objects)
  const selectObject = useCallback(
    (id: string | null) => {
      if (id === null) {
        setSelectedId(null);
        return;
      }
      const target = objects.find((o) => o.id === id);
      if (!target || !target.visible) {
        return;
      }
      setSelectedId(id);
    },
    [objects]
  );

  const deselectObject = useCallback(() => {
    setSelectedId(null);
  }, []);

  const selectedObject = useMemo(() => {
    return objects.find((obj) => obj.id === selectedId) || null;
  }, [objects, selectedId]);

  // Object Property Updates with Real-time Plumbing Kinematic Synchronization
  const updateObject = useCallback(
    (id: string, updates: Partial<EditorObject>, skipHistory: boolean = false) => {
      if (!skipHistory) {
        pushHistory(objects, connections);
      }
      setObjects((prev) => {
        const updated = prev.map((obj) => {
          if (obj.id !== id) return obj;
          return {
            ...obj,
            ...updates,
            position: updates.position
              ? { ...obj.position, ...updates.position }
              : obj.position,
            dimensions: updates.dimensions
              ? { ...obj.dimensions, ...updates.dimensions }
              : obj.dimensions,
            rotation: updates.rotation
              ? { ...obj.rotation, ...updates.rotation }
              : obj.rotation,
            material: updates.material
              ? { ...obj.material, ...updates.material }
              : obj.material,
            parameters: updates.parameters
              ? { ...obj.parameters, ...updates.parameters }
              : obj.parameters,
          };
        });

        // Automatically update pipe endpoints when connected components move
        return updateConnectedPlumbing(id, updated, connections);
      });
    },
    [objects, connections, pushHistory]
  );

  // Toggle Object Visibility
  const toggleVisibility = useCallback(
    (id: string) => {
      pushHistory(objects, connections);
      setObjects((prev) =>
        prev.map((obj) => {
          if (obj.id === id) {
            const nextVis = !obj.visible;
            if (!nextVis && selectedId === id) {
              setSelectedId(null);
            }
            return { ...obj, visible: nextVis };
          }
          return obj;
        })
      );
    },
    [objects, connections, selectedId, pushHistory]
  );

  // Toggle Object Lock
  const toggleLock = useCallback(
    (id: string) => {
      pushHistory(objects, connections);
      setObjects((prev) =>
        prev.map((obj) =>
          obj.id === id ? { ...obj, locked: !obj.locked } : obj
        )
      );
    },
    [objects, connections, pushHistory]
  );

  // Delete Object (removes all connected edges as well)
  const deleteObject = useCallback(
    (id: string) => {
      const target = objects.find((o) => o.id === id);
      if (target?.locked) return;

      pushHistory(objects, connections);
      setObjects((prev) => prev.filter((obj) => obj.id !== id));
      setConnections((prev) => removeEdgesForComponent(prev, id));
      if (selectedId === id) setSelectedId(null);
      if (activeConnectingPort?.componentId === id) setActiveConnectingPort(null);
    },
    [objects, connections, selectedId, activeConnectingPort, pushHistory]
  );

  // Duplicate Object (clones start with disconnected ports to prevent accidental duplicates)
  const duplicateObject = useCallback(
    (id: string) => {
      const target = objects.find((o) => o.id === id);
      if (!target) return;

      pushHistory(objects, connections);
      const newId = `${target.id}-copy-${Date.now().toString(36)}`;
      const duplicated: EditorObject = {
        ...target,
        id: newId,
        name: `${target.name} (Copy)`,
        locked: false,
        position: {
          x: parseFloat((target.position.x + 0.35).toFixed(2)),
          y: parseFloat((target.position.y).toFixed(2)),
          z: parseFloat((target.position.z + 0.35).toFixed(2)),
        },
        rotation: target.rotation ? { ...target.rotation } : { x: 0, y: 0, z: 0 },
        dimensions: { ...target.dimensions },
        material: { ...target.material },
        parameters: { ...target.parameters },
      };

      setObjects((prev) => [...prev, duplicated]);
      setSelectedId(newId);
    },
    [objects, connections, pushHistory]
  );

  // Add Component From Library
  const addComponentFromLibrary = useCallback(
    (template: ComponentTemplate, dropPosition?: Vector3D) => {
      pushHistory(objects, connections);
      const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const newId = `obj-${template.componentType || template.category}-${uniqueSuffix}`;

      let spawnPos: Vector3D;
      if (dropPosition) {
        spawnPos = {
          x: snapSettings.enabled
            ? parseFloat((Math.round(dropPosition.x / snapSettings.translationSnap) * snapSettings.translationSnap).toFixed(2))
            : parseFloat(dropPosition.x.toFixed(2)),
          y: snapSettings.enabled
            ? parseFloat((Math.round(dropPosition.y / snapSettings.translationSnap) * snapSettings.translationSnap).toFixed(2))
            : parseFloat(dropPosition.y.toFixed(2)),
          z: snapSettings.enabled
            ? parseFloat((Math.round(dropPosition.z / snapSettings.translationSnap) * snapSettings.translationSnap).toFixed(2))
            : parseFloat(dropPosition.z.toFixed(2)),
        };
      } else {
        const dynamicItems = objects.filter((o) => o.componentType);
        const count = dynamicItems.length;
        const col = count % 4;
        const row = Math.floor(count / 4) % 3;
        spawnPos = {
          x: parseFloat((-0.9 + col * 0.6).toFixed(2)),
          y: template.category === 'filter' ? 0.8 : parseFloat((-0.5 + row * 0.45).toFixed(2)),
          z: parseFloat((0.2 + (col % 2) * 0.35).toFixed(2)),
        };
      }

      const newObject: EditorObject = {
        id: newId,
        name: template.name,
        category: template.category,
        componentType: template.componentType || 'generic',
        visible: true,
        locked: false,
        position: spawnPos,
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { ...template.defaultDimensions },
        material: { ...template.defaultMaterial },
        parameters: { ...template.defaultParameters },
      };

      setObjects((prev) => [...prev, newObject]);
      setSelectedId(newId);
    },
    [objects, connections, snapSettings, pushHistory]
  );

  // =========================================================================
  // CONNECTION SYSTEM API (Connect, Disconnect, Validate, Diagnostics)
  // =========================================================================

  const startConnecting = useCallback((componentId: string, portId: string) => {
    setActiveConnectingPort({ componentId, portId });
  }, []);

  const cancelConnecting = useCallback(() => {
    setActiveConnectingPort(null);
  }, []);

  const connectPorts = useCallback(
    (
      fromComponentId: string,
      fromPortId: string,
      toComponentId: string,
      toPortId: string
    ): { success: boolean; message?: string } => {
      const fromObj = objects.find((o) => o.id === fromComponentId);
      const toObj = objects.find((o) => o.id === toComponentId);
      if (!fromObj || !toObj) {
        return { success: false, message: 'Component not found.' };
      }

      const fromPorts = getComponentPorts(fromObj);
      const toPorts = getComponentPorts(toObj);
      const fromPort = fromPorts.find((p) => p.id === fromPortId);
      const toPort = toPorts.find((p) => p.id === toPortId);

      if (!fromPort || !toPort) {
        return { success: false, message: 'Invalid port ID.' };
      }

      const validation = validateConnection(
        fromObj,
        fromPort,
        toObj,
        toPort,
        connections
      );
      if (!validation.valid) {
        return {
          success: false,
          message: validation.issue?.message || 'Invalid connection.',
        };
      }

      pushHistory(objects, connections);

      const newEdge = createConnectionEdge(
        fromComponentId,
        fromPortId,
        toComponentId,
        toPortId
      );
      const nextConnections = [...connections, newEdge];
      setConnections(nextConnections);
      setActiveConnectingPort(null);

      // Instantly synchronize visual 3D plumbing alignment
      setObjects((prev) => {
        let synchronized = updateConnectedPlumbing(toComponentId, prev, nextConnections);
        synchronized = updateConnectedPlumbing(fromComponentId, synchronized, nextConnections);
        return synchronized;
      });

      return { success: true };
    },
    [objects, connections, pushHistory]
  );

  const disconnectPorts = useCallback(
    (componentId: string, portId: string) => {
      const edge = findEdgeForPort(connections, componentId, portId);
      if (!edge) return;

      pushHistory(objects, connections);
      setConnections((prev) => prev.filter((e) => e.id !== edge.id));
    },
    [connections, objects, pushHistory]
  );

  const removeConnection = useCallback(
    (edgeId: string) => {
      pushHistory(objects, connections);
      setConnections((prev) => prev.filter((e) => e.id !== edgeId));
    },
    [connections, objects, pushHistory]
  );

  // Graph Analysis & Topology Check
  const graphAnalysis = useMemo(() => {
    return analyzeConnectionGraph(objects, connections);
  }, [objects, connections]);

  // Hydraulic Physics Simulation Engine
  const hydraulicResult = useMemo(() => {
    return simulateHydraulics(objects, connections, {
      isOpenSump: viewportSettings.containerViewMode !== 'opaque',
    });
  }, [objects, connections, viewportSettings.containerViewMode]);

  // Undo / Redo
  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [{ objects, connections }, ...prev]);
    setObjects(previous.objects);
    setConnections(previous.connections);
    setActiveConnectingPort(null);
    setIsDirty(true);
  }, [history, objects, connections]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, { objects, connections }]);
    setObjects(next.objects);
    setConnections(next.connections);
    setActiveConnectingPort(null);
    setIsDirty(true);
  }, [future, objects, connections]);

  // Snapping Toggle
  const toggleSnap = useCallback(() => {
    setSnapSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  // Simulation controls
  const toggleSimulation = useCallback(() => {
    setSimulation((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  const stepSimulation = useCallback(() => {
    setSimulation((prev) => ({
      ...prev,
      simulatedMinutes: prev.simulatedMinutes + 5,
    }));
  }, []);

  const setSimulationSpeed = useCallback((speed: number) => {
    setSimulation((prev) => ({ ...prev, speed }));
  }, []);

  const resetSimulation = useCallback(() => {
    setSimulation((prev) => ({
      ...prev,
      elapsedSeconds: 0,
      simulatedMinutes: 0,
    }));
  }, []);

  // Viewport Settings updater
  const updateViewportSettings = useCallback(
    (updater: (prev: ViewportSettings) => ViewportSettings) => {
      setViewportSettings(updater);
    },
    []
  );

  // Layout sidebar toggles
  const toggleLeftSidebar = useCallback(() => {
    setLayoutSettings((prev) => ({
      ...prev,
      leftSidebarOpen: !prev.leftSidebarOpen,
    }));
  }, []);

  const toggleRightSidebar = useCallback(() => {
    setLayoutSettings((prev) => ({
      ...prev,
      rightSidebarOpen: !prev.rightSidebarOpen,
    }));
  }, []);

  const setActiveLeftTab = useCallback((tab: 'library' | 'outliner') => {
    setLayoutSettings((prev) => ({ ...prev, activeLeftTab: tab }));
  }, []);

  const resetLayout = useCallback(() => {
    setLayoutSettings({
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      activeLeftTab: 'library',
    });
    setViewportSettings({
      viewMode: 'rendered',
      cameraPreset: 'isometric',
      lightingPreset: 'studio',
      showGrid: true,
      showMeasurements: true,
      showHelpers: false,
      unitSystem: 'imperial',
      metricUnit: 'mm',
      containerViewMode: 'transparent',
    });
  }, []);

  const resetScene = useCallback(() => {
    pushHistory(objects, connections);
    setObjects(INITIAL_SCENE_OBJECTS);
    setConnections(INITIAL_CONNECTIONS);
    setActiveConnectingPort(null);
    setSelectedId('obj-filter-container');
  }, [objects, connections, pushHistory]);

  // Metric unit and Container view mode handlers
  const setMetricUnit = useCallback((unit: MetricUnit) => {
    setViewportSettings((prev) => ({ ...prev, metricUnit: unit }));
  }, []);

  const setContainerViewMode = useCallback((mode: ContainerViewMode) => {
    setViewportSettings((prev) => ({ ...prev, containerViewMode: mode }));
  }, []);

  // Custom filter geometry resize
  const resizeFilterContainer = useCallback(
    (containerId: string, newDimensions: Vector3D) => {
      const container = objects.find((o) => o.id === containerId);
      if (!container) return;

      pushHistory(objects, connections);

      const result = resizeContainerAndDividers(container, objects, newDimensions);

      // Update simulation flow & turnover based on new capacity
      const newCapacity = result.updatedContainer.parameters.capacityLiters as number;
      if (typeof newCapacity === 'number' && newCapacity > 0) {
        setSimulation((prev) => {
          const flow = Math.round(newCapacity * 65);
          return {
            ...prev,
            totalFlowGPH: flow,
            calculatedTurnover: parseFloat((flow / 70).toFixed(1)),
          };
        });
      }

      setObjects((prev) => {
        const intermediate = prev.map((obj) => {
          if (obj.id === containerId) return result.updatedContainer;
          const updatedDiv = result.updatedDividers.find((d) => d.id === obj.id);
          if (updatedDiv) return updatedDiv;
          if (result.updatedInteriorVolume && obj.id === result.updatedInteriorVolume.id) {
            return result.updatedInteriorVolume;
          }
          return obj;
        });

        // Recompute connected plumbing to new container dimensions
        return updateConnectedPlumbing(containerId, intermediate, connections);
      });
    },
    [objects, connections, pushHistory]
  );

  // Add a divider inside the container's widest chamber
  const addDividerToContainer = useCallback(
    (containerId: string) => {
      const container = objects.find((o) => o.id === containerId);
      if (!container) return;

      pushHistory(objects, connections);

      const placement = getNewDividerPosition(container, objects);
      const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const dividerId = `obj-filter-divider-${uniqueSuffix}`;

      const newDivider: EditorObject = {
        id: dividerId,
        name: `Chamber Baffle (${objects.filter((o) => o.componentType === 'internal-divider' || o.id.includes('divider') || o.id.includes('baffle')).length + 1})`,
        category: 'filter',
        componentType: 'internal-divider',
        visible: true,
        locked: false,
        position: placement.position,
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: placement.dimensions,
        material: {
          color: '#38bdf8',
          opacity: 0.5,
          roughness: 0.15,
          metalness: 0.1,
          wireframe: false,
          transparent: true,
        },
        parameters: {
          flowPath: 'Dual Under/Overflow Baffle',
          underflowGapMm: 15,
        },
      };

      setObjects((prev) => [...prev, newDivider]);
      setSelectedId(dividerId);
    },
    [objects, connections, pushHistory]
  );

  // =========================================================================
  // PROJECT PERSISTENCE & FILE MANAGEMENT API
  // =========================================================================

  const setProjectName = useCallback((name: string) => {
    setCurrentProject((prev) => ({ ...prev, name: name.trim() || 'Untitled Project' }));
    setIsDirty(true);
  }, []);

  const newProject = useCallback(
    (force: boolean = false): boolean => {
      if (isDirty && !force) {
        setPendingUnsavedAction(() => () => newProject(true));
        return false;
      }
      const newMeta: ProjectMetadata = {
        id: `proj_${Date.now()}`,
        name: 'New Aquarium Filter Project',
        version: CURRENT_PROJECT_APP_VERSION,
        schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'New custom aquarium filter design.',
      };
      setObjects(INITIAL_SCENE_OBJECTS);
      setConnections(INITIAL_CONNECTIONS);
      setCurrentProject(newMeta);
      setSelectedId('obj-filter-container');
      setActiveConnectingPort(null);
      setHistory([]);
      setFuture([]);
      setIsDirty(false);
      clearDraftFromStorage();
      setLastProjectId(newMeta.id);
      return true;
    },
    [isDirty]
  );

  const saveProject = useCallback(async (): Promise<boolean> => {
    const now = new Date().toISOString();
    const updatedMeta: ProjectMetadata = {
      ...currentProject,
      updatedAt: now,
    };
    const projectData: ProjectData = {
      metadata: updatedMeta,
      viewportSettings,
      simulation,
      objects,
      connections,
    };
    await saveProjectToStorage(projectData);
    await setLastProjectId(updatedMeta.id);
    await clearDraftFromStorage();
    setCurrentProject(updatedMeta);
    setIsDirty(false);
    return true;
  }, [currentProject, viewportSettings, simulation, objects, connections]);

  const saveProjectAs = useCallback(
    async (name: string): Promise<boolean> => {
      const now = new Date().toISOString();
      const newId = `proj_${Date.now()}`;
      const updatedMeta: ProjectMetadata = {
        ...currentProject,
        id: newId,
        name: name.trim() || 'Untitled Filter Project',
        createdAt: now,
        updatedAt: now,
      };
      const projectData: ProjectData = {
        metadata: updatedMeta,
        viewportSettings,
        simulation,
        objects,
        connections,
      };
      await saveProjectToStorage(projectData);
      await setLastProjectId(newId);
      await clearDraftFromStorage();
      setCurrentProject(updatedMeta);
      setIsDirty(false);
      return true;
    },
    [currentProject, viewportSettings, simulation, objects, connections]
  );

  const openProject = useCallback(
    async (id: string, force: boolean = false): Promise<boolean> => {
      if (isDirty && !force) {
        setPendingUnsavedAction(() => () => openProject(id, true));
        return false;
      }
      const saved = await getProjectFromStorage(id);
      if (!saved) return false;
      const validation = validateAndMigrateProject(saved);
      if (!validation.isValid || !validation.project) return false;

      const p = validation.project;
      setObjects(p.objects);
      setConnections(p.connections);
      setViewportSettings(p.viewportSettings);
      setSimulation(p.simulation);
      setCurrentProject(p.metadata);
      setSelectedId(p.objects[0]?.id || null);
      setActiveConnectingPort(null);
      setHistory([]);
      setFuture([]);
      setIsDirty(false);
      await setLastProjectId(p.metadata.id);
      await clearDraftFromStorage();
      return true;
    },
    [isDirty]
  );

  const exportProjectFile = useCallback(() => {
    const now = new Date().toISOString();
    const exportMeta: ProjectMetadata = {
      ...currentProject,
      updatedAt: now,
    };
    const projectData: ProjectData = {
      metadata: exportMeta,
      viewportSettings,
      simulation,
      objects,
      connections,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (currentProject.name || 'filter-project')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    link.download = `${safeName}.aquasim`;
    link.click();
    URL.revokeObjectURL(url);
  }, [currentProject, viewportSettings, simulation, objects, connections]);

  const importProjectFile = useCallback(
    async (
      file: File
    ): Promise<{ success: boolean; errors?: string[]; warnings?: string[] }> => {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const validation = validateAndMigrateProject(json);
        if (!validation.isValid || !validation.project) {
          return {
            success: false,
            errors: validation.errors,
            warnings: validation.warnings,
          };
        }

        const p = validation.project;
        setObjects(p.objects);
        setConnections(p.connections);
        setViewportSettings(p.viewportSettings);
        setSimulation(p.simulation);
        setCurrentProject(p.metadata);
        setSelectedId(p.objects[0]?.id || null);
        setActiveConnectingPort(null);
        setHistory([]);
        setFuture([]);
        setIsDirty(false);

        // Auto-save imported file to local storage library
        await saveProjectToStorage(p);
        await setLastProjectId(p.metadata.id);
        await clearDraftFromStorage();

        return {
          success: true,
          warnings: validation.warnings,
        };
      } catch (err: any) {
        return {
          success: false,
          errors: [err.message || 'Failed to read or parse project file.'],
        };
      }
    },
    []
  );

  const listSavedProjects = useCallback(async (): Promise<ProjectStorageItem[]> => {
    return listProjectsFromStorage();
  }, []);

  const deleteSavedProject = useCallback(
    async (id: string): Promise<void> => {
      await deleteProjectFromStorage(id);
      if (currentProject.id === id) {
        const fallbackMeta: ProjectMetadata = {
          ...DEFAULT_PROJECT_METADATA,
          id: `proj_${Date.now()}`,
        };
        setCurrentProject(fallbackMeta);
        await setLastProjectId(null);
      }
    },
    [currentProject.id]
  );

  const executePendingUnsavedAction = useCallback(() => {
    if (pendingUnsavedAction) {
      const action = pendingUnsavedAction;
      setPendingUnsavedAction(null);
      action();
    }
  }, [pendingUnsavedAction]);

  const clearPendingUnsavedAction = useCallback(() => {
    setPendingUnsavedAction(null);
  }, []);

  const exportProjectJSON = useCallback(() => {
    exportProjectFile();
  }, [exportProjectFile]);

  // Warn before discarding unsaved changes on browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Initial load: Restore last active project or auto-saved draft from storage
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const lastId = await getLastProjectId();
        if (lastId) {
          const saved = await getProjectFromStorage(lastId);
          if (saved && isMounted) {
            const val = validateAndMigrateProject(saved);
            if (val.isValid && val.project) {
              setObjects(val.project.objects);
              setConnections(val.project.connections);
              setViewportSettings(val.project.viewportSettings);
              setSimulation(val.project.simulation);
              setCurrentProject(val.project.metadata);
              setSelectedId(val.project.objects[0]?.id || null);
              setIsDirty(false);
              return;
            }
          }
        }

        const draft = await getDraftFromStorage();
        if (draft && isMounted) {
          const val = validateAndMigrateProject(draft);
          if (val.isValid && val.project) {
            setObjects(val.project.objects);
            setConnections(val.project.connections);
            setViewportSettings(val.project.viewportSettings);
            setSimulation(val.project.simulation);
            setCurrentProject(val.project.metadata);
            setSelectedId(val.project.objects[0]?.id || null);
            setIsDirty(false);
          }
        }
      } catch (err) {
        console.warn('Failed to restore previous session:', err);
      }
    }
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced auto-save draft to IndexedDB when dirty
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      const draftData: ProjectData = {
        metadata: {
          ...currentProject,
          updatedAt: new Date().toISOString(),
        },
        viewportSettings,
        simulation,
        objects,
        connections,
      };
      saveDraftToStorage(draftData);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isDirty, objects, connections, viewportSettings, simulation, currentProject]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save Shortcut (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProject();
        return;
      }

      // Cancel active connection mode on Escape
      if (e.key === 'Escape' && activeConnectingPort) {
        cancelConnecting();
        return;
      }

      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      // Duplicate Object
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedId) duplicateObject(selectedId);
      }
      // Transform Mode hotkeys
      else if (e.key.toLowerCase() === 'w') {
        setTransformMode('translate');
      } else if (e.key.toLowerCase() === 'e') {
        setTransformMode('rotate');
      } else if (e.key.toLowerCase() === 'r') {
        setTransformMode('scale');
      }
      // Toggle Snapping
      else if (e.key.toLowerCase() === 'x') {
        toggleSnap();
      }
      // Simulation Run/Pause
      else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleSimulation();
      }
      // Delete Object
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          deleteObject(selectedId);
        }
      }
      // Deselect
      else if (e.key === 'Escape') {
        deselectObject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    saveProject,
    undo,
    redo,
    duplicateObject,
    deleteObject,
    deselectObject,
    toggleSimulation,
    toggleSnap,
    selectedId,
    activeConnectingPort,
    cancelConnecting,
  ]);

  return (
    <EditorContext.Provider
      value={{
        objects,
        selectedId,
        selectedObject,
        selectObject,
        deselectObject,
        updateObject,
        toggleVisibility,
        toggleLock,
        deleteObject,
        duplicateObject,
        addComponentFromLibrary,
        connections,
        activeConnectingPort,
        connectPorts,
        disconnectPorts,
        removeConnection,
        startConnecting,
        cancelConnecting,
        graphAnalysis,
        hydraulicResult,
        currentProject,
        isDirty,
        setProjectName,
        newProject,
        saveProject,
        saveProjectAs,
        openProject,
        exportProjectFile,
        importProjectFile,
        listSavedProjects,
        deleteSavedProject,
        pendingUnsavedAction,
        setPendingUnsavedAction,
        executePendingUnsavedAction,
        clearPendingUnsavedAction,
        transformMode,
        setTransformMode,
        snapSettings,
        setSnapSettings,
        toggleSnap,
        undo,
        redo,
        canUndo: history.length > 0,
        canRedo: future.length > 0,
        simulation,
        toggleSimulation,
        stepSimulation,
        setSimulationSpeed,
        resetSimulation,
        resizeFilterContainer,
        addDividerToContainer,
        setMetricUnit,
        setContainerViewMode,
        viewportSettings,
        updateViewportSettings,
        layoutSettings,
        toggleLeftSidebar,
        toggleRightSidebar,
        setActiveLeftTab,
        resetLayout,
        resetScene,
        exportProjectJSON,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export function useEditor(): EditorContextType {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
