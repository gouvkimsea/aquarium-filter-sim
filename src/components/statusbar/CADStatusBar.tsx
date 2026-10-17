import React from 'react';
import {
  MousePointer,
  RotateCcw,
  Layers,
  Ruler,
  Globe,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

export const CADStatusBar: React.FC = () => {
  const {
    selectedObject,
    simulation,
    viewportSettings,
    updateViewportSettings,
    objects,
    transformMode,
    snapSettings,
  } = useEditor();

  const toggleUnitSystem = () => {
    updateViewportSettings((prev) => ({
      ...prev,
      unitSystem: prev.unitSystem === 'metric' ? 'imperial' : 'metric',
    }));
  };

  const handleResetCamera = () => {
    updateViewportSettings((prev) => ({ ...prev, cameraPreset: 'isometric' }));
  };

  // Calculate Tank Dimensions based on selected unit system
  const isMetric = viewportSettings.unitSystem === 'metric';
  const tankDimensionsText = isMetric
    ? 'DIM: 120 × 45 × 50 cm  •  VOL: 270 L  •  MASS: ~285 kg'
    : 'DIM: 48 × 18 × 21 in  •  VOL: 71.3 Gal  •  MASS: ~628 lbs';

  return (
    <footer id="cad-status-bar" className="cad-status-bar">
      {/* 1. Left: Selection Readout */}
      <div className="status-section status-left">
        <div className="status-badge" id="status-selection-badge">
          <MousePointer size={12} className="text-cyan-400" />
          {selectedObject ? (
            <span className="selection-readout">
              SELECTED: <strong>{selectedObject.name}</strong>
              {selectedObject.locked && <span className="status-locked-chip">[LOCKED]</span>}
              <span className="coord-mini-hint">
                ({selectedObject.position.x}, {selectedObject.position.y}, {selectedObject.position.z})
              </span>
            </span>
          ) : (
            <span className="selection-readout text-dim">
              NO SELECTION (Click 3D mesh or outliner)
            </span>
          )}
        </div>

        <div className="status-badge">
          <Layers size={12} className="text-dim" />
          <span>OBJECTS: {objects.length}</span>
        </div>

        <div className="status-badge transform-tool-badge">
          <span className="text-dim">TOOL:</span>
          <strong className="text-sky-400">{transformMode.toUpperCase()}</strong>
          <span className="status-snap-indicator">
            [SNAP: {snapSettings.enabled ? `${snapSettings.translationSnap}m` : 'OFF'}]
          </span>
        </div>
      </div>

      {/* 2. Center: Real-time Physical Measurements */}
      <div className="status-section status-center">
        <div className="measurements-pill" id="status-measurements">
          <Ruler size={12} className="text-emerald-400" />
          <span>{tankDimensionsText}</span>
        </div>
      </div>

      {/* 3. Right: Simulation State, Unit Selector & Camera Reset */}
      <div className="status-section status-right">
        {/* Simulation indicator */}
        <div className="status-badge sim-state-badge" id="status-sim-state">
          <span className={`status-dot ${simulation.isRunning ? 'active' : 'idle'}`} />
          <span>
            {simulation.isRunning ? `RUNNING (${simulation.speed}x)` : 'PAUSED'}
          </span>
        </div>

        {/* Unit System Toggle Button */}
        <button
          id="btn-toggle-unit-system"
          className="status-action-btn"
          onClick={toggleUnitSystem}
          title="Toggle Unit System (Metric / Imperial)"
        >
          <Globe size={12} />
          <span>{viewportSettings.unitSystem.toUpperCase()}</span>
        </button>

        {/* Reset Camera Button */}
        <button
          id="btn-reset-camera-status"
          className="status-action-btn"
          onClick={handleResetCamera}
          title="Reset Camera to Isometric View"
        >
          <RotateCcw size={12} />
          <span>RESET VIEW</span>
        </button>
      </div>
    </footer>
  );
};
