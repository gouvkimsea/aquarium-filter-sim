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
} from '../types/editor';
import { INITIAL_SCENE_OBJECTS } from '../data/componentLibrary';
import {
  resizeContainerAndDividers,
  getNewDividerPosition,
} from '../utils/filterGeometry';

interface EditorContextType {
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

  // Undo / Redo history
  const [history, setHistory] = useState<EditorObject[][]>([]);
  const [future, setFuture] = useState<EditorObject[][]>([]);

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
  const pushHistory = useCallback((currentObjects: EditorObject[]) => {
    setHistory((prev) => [...prev.slice(-MAX_HISTORY), currentObjects]);
    setFuture([]);
  }, []);

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
        // Do not select hidden objects
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

  // Object Property Updates (support optional skipHistory for dragging, commit on finish)
  const updateObject = useCallback(
    (id: string, updates: Partial<EditorObject>, skipHistory: boolean = false) => {
      if (!skipHistory) {
        pushHistory(objects);
      }
      setObjects((prev) =>
        prev.map((obj) => {
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
        })
      );
    },
    [objects, pushHistory]
  );

  // Toggle Object Visibility
  const toggleVisibility = useCallback(
    (id: string) => {
      pushHistory(objects);
      setObjects((prev) =>
        prev.map((obj) => {
          if (obj.id === id) {
            const nextVis = !obj.visible;
            // If turning off visibility and it's selected, deselect
            if (!nextVis && selectedId === id) {
              setSelectedId(null);
            }
            return { ...obj, visible: nextVis };
          }
          return obj;
        })
      );
    },
    [objects, selectedId, pushHistory]
  );

  // Toggle Object Lock
  const toggleLock = useCallback(
    (id: string) => {
      pushHistory(objects);
      setObjects((prev) =>
        prev.map((obj) =>
          obj.id === id ? { ...obj, locked: !obj.locked } : obj
        )
      );
    },
    [objects, pushHistory]
  );

  // Delete Object
  const deleteObject = useCallback(
    (id: string) => {
      const target = objects.find((o) => o.id === id);
      if (target?.locked) return; // Prevent deleting locked objects

      pushHistory(objects);
      setObjects((prev) => prev.filter((obj) => obj.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [objects, selectedId, pushHistory]
  );

  // Duplicate Object
  const duplicateObject = useCallback(
    (id: string) => {
      const target = objects.find((o) => o.id === id);
      if (!target) return;

      pushHistory(objects);
      const newId = `${target.id}-copy-${Date.now().toString(36)}`;
      const duplicated: EditorObject = {
        ...target,
        id: newId,
        name: `${target.name} (Copy)`,
        locked: false, // Clones are unlocked by default
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
    [objects, pushHistory]
  );

  // Add Component From Library
  const addComponentFromLibrary = useCallback(
    (template: ComponentTemplate, dropPosition?: Vector3D) => {
      pushHistory(objects);
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
        // Predictable staging position right above tank center, staggered neatly
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
    [objects, snapSettings, pushHistory]
  );

  // Undo / Redo
  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [objects, ...prev]);
    setObjects(previous);
  }, [history, objects]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, objects]);
    setObjects(next);
  }, [future, objects]);

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
    pushHistory(objects);
    setObjects(INITIAL_SCENE_OBJECTS);
    setSelectedId('obj-filter-container');
  }, [objects, pushHistory]);

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

      pushHistory(objects);

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
        return prev.map((obj) => {
          if (obj.id === containerId) return result.updatedContainer;
          const updatedDiv = result.updatedDividers.find((d) => d.id === obj.id);
          if (updatedDiv) return updatedDiv;
          if (result.updatedInteriorVolume && obj.id === result.updatedInteriorVolume.id) {
            return result.updatedInteriorVolume;
          }
          return obj;
        });
      });
    },
    [objects, pushHistory]
  );

  // Add a divider inside the container's widest chamber
  const addDividerToContainer = useCallback(
    (containerId: string) => {
      const container = objects.find((o) => o.id === containerId);
      if (!container) return;

      pushHistory(objects);

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
    [objects, pushHistory]
  );

  const exportProjectJSON = useCallback(() => {
    const data = {
      project: 'Aquarium Filter Simulator',
      version: '0.1.0',
      exportedAt: new Date().toISOString(),
      viewportSettings,
      simulation,
      objects,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aquarium-sim-project-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [objects, viewportSettings, simulation]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if active element is an input/textarea
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
    undo,
    redo,
    duplicateObject,
    deleteObject,
    deselectObject,
    toggleSimulation,
    toggleSnap,
    selectedId,
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
