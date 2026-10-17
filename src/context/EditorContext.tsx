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
} from '../types/editor';
import { INITIAL_SCENE_OBJECTS } from '../data/componentLibrary';

interface EditorContextType {
  // Scene Objects & Selection
  objects: EditorObject[];
  selectedId: string | null;
  selectedObject: EditorObject | null;
  selectObject: (id: string | null) => void;
  updateObject: (id: string, updates: Partial<EditorObject>) => void;
  toggleVisibility: (id: string) => void;
  deleteObject: (id: string) => void;
  addComponentFromLibrary: (template: ComponentTemplate) => void;

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
  const [selectedId, setSelectedId] = useState<string | null>('obj-filter-unit');

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
    lightingPreset: 'daylight',
    showGrid: true,
    showMeasurements: true,
    showHelpers: false,
    unitSystem: 'imperial',
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

  // Object Selection
  const selectObject = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const selectedObject = useMemo(() => {
    return objects.find((obj) => obj.id === selectedId) || null;
  }, [objects, selectedId]);

  // Object Property Updates
  const updateObject = useCallback(
    (id: string, updates: Partial<EditorObject>) => {
      pushHistory(objects);
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
        prev.map((obj) =>
          obj.id === id ? { ...obj, visible: !obj.visible } : obj
        )
      );
    },
    [objects, pushHistory]
  );

  // Delete Object
  const deleteObject = useCallback(
    (id: string) => {
      pushHistory(objects);
      setObjects((prev) => prev.filter((obj) => obj.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [objects, selectedId, pushHistory]
  );

  // Add Component From Library
  const addComponentFromLibrary = useCallback(
    (template: ComponentTemplate) => {
      pushHistory(objects);
      const newId = `obj-${template.category}-${Date.now().toString(36)}`;
      const newObject: EditorObject = {
        id: newId,
        name: template.name,
        category: template.category,
        visible: true,
        position: {
          x: (Math.random() - 0.5) * 2.0,
          y: template.category === 'filter' ? 1.4 : -1.2,
          z: (Math.random() - 0.5) * 1.5,
        },
        dimensions: { ...template.defaultDimensions },
        material: { ...template.defaultMaterial },
        parameters: { ...template.defaultParameters },
      };

      setObjects((prev) => [...prev, newObject]);
      setSelectedId(newId);
    },
    [objects, pushHistory]
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
      lightingPreset: 'daylight',
      showGrid: true,
      showMeasurements: true,
      showHelpers: false,
      unitSystem: 'imperial',
    });
  }, []);

  const resetScene = useCallback(() => {
    pushHistory(objects);
    setObjects(INITIAL_SCENE_OBJECTS);
    setSelectedId('obj-filter-unit');
  }, [objects, pushHistory]);

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

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleSimulation();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && selectedId !== 'obj-tank-enclosure') {
          deleteObject(selectedId);
        }
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, toggleSimulation, deleteObject, selectedId]);

  return (
    <EditorContext.Provider
      value={{
        objects,
        selectedId,
        selectedObject,
        selectObject,
        updateObject,
        toggleVisibility,
        deleteObject,
        addComponentFromLibrary,
        undo,
        redo,
        canUndo: history.length > 0,
        canRedo: future.length > 0,
        simulation,
        toggleSimulation,
        stepSimulation,
        setSimulationSpeed,
        resetSimulation,
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
