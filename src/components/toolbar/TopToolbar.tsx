import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Layers,
  Box,
  Camera,
  Sun,
  Moon,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Grid3X3,
  Ruler,
  Waves,
  Move,
  RotateCw,
  Magnet,
  Copy,
  Trash2,
  Scissors,
  Save,
  FilePlus,
  FolderOpen,
  FileDown,
  Tag,
  Check,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import type { ViewMode, CameraPreset, LightingPreset } from '../../types/editor';
import { ProjectManagerModal } from '../modals/ProjectManagerModal';
import { SaveAsDialog } from '../modals/SaveAsDialog';
import { UnsavedChangesDialog } from '../modals/UnsavedChangesDialog';

export const TopToolbar: React.FC = () => {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    simulation,
    toggleSimulation,
    stepSimulation,
    setSimulationSpeed,
    viewportSettings,
    updateViewportSettings,
    setContainerViewMode,
    layoutSettings,
    toggleLeftSidebar,
    toggleRightSidebar,
    resetScene,
    transformMode,
    setTransformMode,
    snapSettings,
    toggleSnap,
    selectedObject,
    duplicateObject,
    deleteObject,
    currentProject,
    isDirty,
    newProject,
    saveProject,
    exportProjectFile,
  } = useEditor();

  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const setViewMode = (viewMode: ViewMode) => {
    updateViewportSettings((prev) => ({ ...prev, viewMode }));
  };

  const setCameraPreset = (cameraPreset: CameraPreset) => {
    updateViewportSettings((prev) => ({ ...prev, cameraPreset }));
  };

  const setLightingPreset = (lightingPreset: LightingPreset) => {
    updateViewportSettings((prev) => ({ ...prev, lightingPreset }));
  };

  const toggleGrid = () => {
    updateViewportSettings((prev) => ({ ...prev, showGrid: !prev.showGrid }));
  };

  const toggleMeasurements = () => {
    updateViewportSettings((prev) => ({
      ...prev,
      showMeasurements: !prev.showMeasurements,
    }));
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Format simulated minutes into HH:MM
  const formatSimTime = (mins: number) => {
    const totalMinutes = Math.floor(mins);
    const hours = Math.floor(totalMinutes / 60);
    const remainingMins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${remainingMins.toString().padStart(2, '0')}:00`;
  };

  return (
    <header id="cad-top-toolbar" className="cad-toolbar">
      {/* 1. Left Section: Logo, File Menu, Undo/Redo, Left Sidebar Toggle */}
      <div className="toolbar-section toolbar-left">
        <button
          id="btn-toggle-left-sidebar"
          className="toolbar-btn icon-only"
          onClick={toggleLeftSidebar}
          title={layoutSettings.leftSidebarOpen ? 'Hide Library (Ctrl+[)' : 'Show Library'}
          aria-label="Toggle Left Sidebar"
        >
          {layoutSettings.leftSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        <div className="cad-brand">
          <div className="cad-logo-glyph">
            <Waves size={16} />
          </div>
          <span className="cad-app-name">AQUARIUM CAD</span>
          <span className="cad-version-tag">v0.1</span>
        </div>

        <div className="toolbar-separator" />

        <div className="dropdown-wrapper">
          <button
            id="btn-file-menu"
            className="toolbar-btn"
            onClick={() => setShowFileMenu(!showFileMenu)}
            title="Project File Actions"
          >
            <span>Project</span>
            {isDirty && <span className="dirty-indicator-dot" title="Unsaved changes">•</span>}
          </button>

          {showFileMenu && (
            <div className="toolbar-dropdown-menu" onMouseLeave={() => setShowFileMenu(false)}>
              <button
                id="menu-new-project"
                className="dropdown-item"
                onClick={() => {
                  newProject();
                  setShowFileMenu(false);
                }}
              >
                <FilePlus size={14} className="text-cyan-400" />
                <span>New Project</span>
              </button>

              <button
                id="menu-save-project"
                className="dropdown-item"
                onClick={async () => {
                  await saveProject();
                  setSaveFeedback('Project Saved!');
                  setTimeout(() => setSaveFeedback(null), 2500);
                  setShowFileMenu(false);
                }}
              >
                <Save size={14} className="text-emerald-400" />
                <span>Save Project</span>
                <span className="shortcut-hint">Ctrl+S</span>
              </button>

              <button
                id="menu-save-as-project"
                className="dropdown-item"
                onClick={() => {
                  setShowSaveAsModal(true);
                  setShowFileMenu(false);
                }}
              >
                <Tag size={14} className="text-sky-400" />
                <span>Save As...</span>
              </button>

              <button
                id="menu-open-project"
                className="dropdown-item"
                onClick={() => {
                  setShowProjectModal(true);
                  setShowFileMenu(false);
                }}
              >
                <FolderOpen size={14} className="text-amber-400" />
                <span>Open Project Library...</span>
              </button>

              <div className="dropdown-divider" />

              <button
                id="menu-export-aquasim"
                className="dropdown-item"
                onClick={() => {
                  exportProjectFile();
                  setShowFileMenu(false);
                }}
              >
                <FileDown size={14} />
                <span>Export Project File (.aquasim)</span>
              </button>

              <button
                id="menu-reset-scene"
                className="dropdown-item hover-danger"
                onClick={() => {
                  resetScene();
                  setShowFileMenu(false);
                }}
              >
                <RotateCcw size={14} />
                <span>Reset to Default Tank</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Save Button */}
        <button
          id="btn-quick-save"
          className="toolbar-btn icon-only"
          onClick={async () => {
            await saveProject();
            setSaveFeedback('Saved!');
            setTimeout(() => setSaveFeedback(null), 2000);
          }}
          title={isDirty ? 'Save Changes (Ctrl+S)' : 'All Changes Saved to Browser Storage (Ctrl+S)'}
          aria-label="Save"
        >
          {saveFeedback ? (
            <Check size={15} className="text-emerald-400" />
          ) : (
            <Save size={15} className={isDirty ? 'text-amber-400' : 'text-emerald-400'} />
          )}
        </button>

        {/* Current Active Project Title Badge */}
        <div
          className="cad-current-project-pill"
          onClick={() => setShowSaveAsModal(true)}
          title="Current active project. Click to rename or save as copy."
        >
          <span className="proj-name">{currentProject.name}</span>
          {isDirty ? (
            <span className="dirty-badge" title="Unsaved changes">*</span>
          ) : (
            <span className="saved-badge" title="Saved to Browser Storage">✓</span>
          )}
        </div>

        {/* Undo / Redo */}
        <button
          id="btn-undo"
          className="toolbar-btn icon-only"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={15} />
        </button>

        <button
          id="btn-redo"
          className="toolbar-btn icon-only"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 size={15} />
        </button>

        <div className="toolbar-separator" />

        {/* Transform Mode Switchers */}
        <div className="button-group" title="Transform Tool (W: Move, E: Rotate, R: Resize)">
          <button
            id="tb-btn-mode-translate"
            className={`segmented-btn ${transformMode === 'translate' ? 'active' : ''}`}
            onClick={() => setTransformMode('translate')}
            title="Move / Translate Mode (W)"
          >
            <Move size={14} />
          </button>
          <button
            id="tb-btn-mode-rotate"
            className={`segmented-btn ${transformMode === 'rotate' ? 'active' : ''}`}
            onClick={() => setTransformMode('rotate')}
            title="Rotate Mode (E)"
          >
            <RotateCw size={14} />
          </button>
          <button
            id="tb-btn-mode-scale"
            className={`segmented-btn ${transformMode === 'scale' ? 'active' : ''}`}
            onClick={() => setTransformMode('scale')}
            title="Resize / Scale Mode (R)"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Grid Snapping Toggle */}
        <button
          id="tb-btn-toggle-snap"
          className={`toolbar-btn snap-toggle-btn ${snapSettings.enabled ? 'active' : ''}`}
          onClick={toggleSnap}
          title={`Toggle Grid Snapping (X) - Currently ${snapSettings.enabled ? 'ON' : 'OFF'}`}
        >
          <Magnet size={13} />
          <span>SNAP</span>
        </button>

        {/* Selected Object Quick Actions */}
        {selectedObject && (
          <>
            <button
              id="tb-btn-duplicate"
              className="toolbar-btn icon-only"
              onClick={() => duplicateObject(selectedObject.id)}
              title="Duplicate Selected Object (Ctrl+D)"
            >
              <Copy size={14} />
            </button>
            {!selectedObject.locked && (
              <button
                id="tb-btn-delete"
                className="toolbar-btn icon-only hover-danger"
                onClick={() => deleteObject(selectedObject.id)}
                title="Delete Selected Object (Del)"
              >
                <Trash2 size={14} />
              </button>
            )}
          </>
        )}
      </div>

      {/* 2. Center Section: Simulation Transport Bar */}
      <div className="toolbar-section toolbar-center">
        <div className="simulation-transport-bar">
          <button
            id="btn-play-pause-simulation"
            className={`transport-btn ${simulation.isRunning ? 'running' : 'paused'}`}
            onClick={toggleSimulation}
            title={simulation.isRunning ? 'Pause Simulation (Space)' : 'Start Simulation (Space)'}
          >
            {simulation.isRunning ? <Pause size={14} /> : <Play size={14} />}
            <span>{simulation.isRunning ? 'PAUSE' : 'RUN'}</span>
          </button>

          <button
            id="btn-step-simulation"
            className="transport-btn secondary"
            onClick={stepSimulation}
            title="Advance +5 Simulated Minutes"
          >
            <SkipForward size={13} />
            <span>+5m</span>
          </button>

          {/* Speed Multiplier Selectors */}
          <div className="speed-pills">
            {[0.5, 1.0, 2.0, 5.0].map((spd) => (
              <button
                key={spd}
                id={`btn-speed-${spd}x`}
                className={`speed-pill ${simulation.speed === spd ? 'active' : ''}`}
                onClick={() => setSimulationSpeed(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Time Counter Readout */}
          <div className="sim-clock-display" title="Total Simulated Cycle Duration">
            <span className="clock-label">CYCLE:</span>
            <span className="clock-time">{formatSimTime(simulation.simulatedMinutes)}</span>
          </div>

          {/* Live Turnover Pill */}
          <div className="turnover-pill" title="Total Filter Turnover per Hour">
            <span className="pill-dot" />
            <span>{simulation.calculatedTurnover}x / hr</span>
          </div>
        </div>
      </div>

      {/* 3. Right Section: View Modes, Camera Presets, Lighting, Right Sidebar Toggle */}
      <div className="toolbar-section toolbar-right">
        {/* Container View Mode (Transparent / Opaque / Cutaway) */}
        <div className="button-group" title="Filter Container View Mode (Transparent / Opaque / Cutaway)">
          <button
            id="tb-btn-container-transparent"
            className={`segmented-btn ${viewportSettings.containerViewMode === 'transparent' ? 'active' : ''}`}
            onClick={() => setContainerViewMode('transparent')}
            title="Container: Clear Acrylic (Transparent)"
          >
            <Eye size={14} />
          </button>
          <button
            id="tb-btn-container-opaque"
            className={`segmented-btn ${viewportSettings.containerViewMode === 'opaque' ? 'active' : ''}`}
            onClick={() => setContainerViewMode('opaque')}
            title="Container: Solid Technical Polymer (Opaque)"
          >
            <Box size={14} />
          </button>
          <button
            id="tb-btn-container-cutaway"
            className={`segmented-btn ${viewportSettings.containerViewMode === 'cutaway' ? 'active' : ''}`}
            onClick={() => setContainerViewMode('cutaway')}
            title="Container: Cross-Section Inspection (Cutaway)"
          >
            <Scissors size={14} />
          </button>
        </div>

        {/* View Mode (Solid / Wireframe / X-Ray) */}
        <div className="button-group" title="Viewport Shading Mode">
          <button
            id="btn-view-rendered"
            className={`segmented-btn ${viewportSettings.viewMode === 'rendered' ? 'active' : ''}`}
            onClick={() => setViewMode('rendered')}
            title="Solid Shaded View"
          >
            <Box size={14} />
          </button>
          <button
            id="btn-view-wireframe"
            className={`segmented-btn ${viewportSettings.viewMode === 'wireframe' ? 'active' : ''}`}
            onClick={() => setViewMode('wireframe')}
            title="Wireframe Mesh View"
          >
            <Layers size={14} />
          </button>
        </div>

        {/* Camera Preset Dropdown */}
        <div className="camera-select-wrapper">
          <Camera size={13} className="camera-icon-hint" />
          <select
            id="select-camera-preset"
            className="camera-dropdown"
            value={viewportSettings.cameraPreset}
            onChange={(e) => setCameraPreset(e.target.value as CameraPreset)}
            title="Camera View Angle"
          >
            <option value="isometric">Perspective</option>
            <option value="top">Top (Inside Filter)</option>
            <option value="front">Front View</option>
            <option value="side">Right Side View</option>
            <option value="left">Left Side View</option>
            <option value="back">Rear View</option>
            <option value="filter-closeup">Filter Closeup</option>
          </select>
        </div>

        {/* View Overlays (Grid & Measurements) */}
        <div className="button-group">
          <button
            id="btn-toggle-grid"
            className={`segmented-btn ${viewportSettings.showGrid ? 'active' : ''}`}
            onClick={toggleGrid}
            title={viewportSettings.showGrid ? 'Hide Coordinate Grid' : 'Show Coordinate Grid'}
          >
            <Grid3X3 size={14} />
          </button>
          <button
            id="btn-toggle-measurements"
            className={`segmented-btn ${viewportSettings.showMeasurements ? 'active' : ''}`}
            onClick={toggleMeasurements}
            title={viewportSettings.showMeasurements ? 'Hide Dimension Labels' : 'Show Dimension Labels'}
          >
            <Ruler size={14} />
          </button>
        </div>

        {/* Lighting Mode Quick Selector */}
        <div className="button-group" title="Studio / Aquarium Lighting Preset">
          <button
            id="btn-light-studio"
            className={`segmented-btn ${viewportSettings.lightingPreset === 'studio' ? 'active' : ''}`}
            onClick={() => setLightingPreset('studio')}
            title="Clean CAD Studio Lighting"
          >
            <Sun size={13} />
          </button>
          <button
            id="btn-light-daylight"
            className={`segmented-btn ${viewportSettings.lightingPreset === 'daylight' ? 'active' : ''}`}
            onClick={() => setLightingPreset('daylight')}
            title="Daylight Spectrum"
          >
            <Eye size={13} />
          </button>
          <button
            id="btn-light-actinic"
            className={`segmented-btn ${viewportSettings.lightingPreset === 'actinic' ? 'active' : ''}`}
            onClick={() => setLightingPreset('actinic')}
            title="Actinic Marine Blue"
          >
            <Layers size={13} />
          </button>
          <button
            id="btn-light-night"
            className={`segmented-btn ${viewportSettings.lightingPreset === 'night' ? 'active' : ''}`}
            onClick={() => setLightingPreset('night')}
            title="Night Moon Mode"
          >
            <Moon size={13} />
          </button>
        </div>

        <div className="toolbar-separator" />

        {/* Fullscreen & Right Sidebar Toggle */}
        <button
          id="btn-fullscreen-toggle"
          className="toolbar-btn icon-only"
          onClick={toggleFullScreen}
          title="Toggle Fullscreen"
          aria-label="Toggle Fullscreen"
        >
          <Maximize2 size={15} />
        </button>

        <button
          id="btn-toggle-right-sidebar"
          className="toolbar-btn icon-only"
          onClick={toggleRightSidebar}
          title={layoutSettings.rightSidebarOpen ? 'Hide Inspector (Ctrl+])' : 'Show Inspector'}
          aria-label="Toggle Right Sidebar"
        >
          {layoutSettings.rightSidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>

      {/* Project Persistence Modals & Dialogs */}
      <ProjectManagerModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
      />
      <SaveAsDialog
        isOpen={showSaveAsModal}
        onClose={() => setShowSaveAsModal(false)}
      />
      <UnsavedChangesDialog />
    </header>
  );
};
