import React, { useMemo } from 'react';
import {
  MousePointer,
  RotateCcw,
  Layers,
  Ruler,
  Globe,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import {
  toDisplayUnits,
  formatVolume,
  calculateChambers,
} from '../../utils/filterGeometry';

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

  const cycleUnitSystem = () => {
    updateViewportSettings((prev) => {
      if (prev.unitSystem === 'metric' && prev.metricUnit === 'mm') {
        return { ...prev, metricUnit: 'cm' };
      } else if (prev.unitSystem === 'metric' && prev.metricUnit === 'cm') {
        return { ...prev, unitSystem: 'imperial' };
      } else {
        return { ...prev, unitSystem: 'metric', metricUnit: 'mm' };
      }
    });
  };

  const handleResetCamera = () => {
    updateViewportSettings((prev) => ({ ...prev, cameraPreset: 'isometric' }));
  };

  // Calculate Tank Dimensions based on selected unit system
  const isMetric = viewportSettings.unitSystem === 'metric';
  const tankDimensionsText = isMetric
    ? viewportSettings.metricUnit === 'mm'
      ? 'TANK: 1200 × 450 × 500 mm • 270 L'
      : 'TANK: 120 × 45 × 50 cm • 270 L'
    : 'TANK: 48 × 18 × 21 in • 71.3 Gal';

  // Filter Basin Telemetry
  const filterContainer = useMemo(
    () => objects.find((o) => o.componentType === 'filter-container' || o.id === 'obj-filter-container'),
    [objects]
  );

  const filterChambers = useMemo(
    () => (filterContainer ? calculateChambers(filterContainer, objects) : null),
    [filterContainer, objects]
  );

  const filterBasinText = useMemo(() => {
    if (!filterContainer || !filterChambers) return null;
    const w = toDisplayUnits(filterContainer.dimensions.x, viewportSettings.unitSystem, viewportSettings.metricUnit).formatted;
    const h = toDisplayUnits(filterContainer.dimensions.y, viewportSettings.unitSystem, viewportSettings.metricUnit).formatted;
    const d = toDisplayUnits(filterContainer.dimensions.z, viewportSettings.unitSystem, viewportSettings.metricUnit).formatted;
    const vol = formatVolume(filterChambers.totalInternalVolumeLiters, viewportSettings.unitSystem);
    return `BASIN: ${w} × ${h} × ${d} • ${vol} (${filterChambers.chambers.length} Ch)`;
  }, [filterContainer, filterChambers, viewportSettings.unitSystem, viewportSettings.metricUnit]);

  const unitLabel = viewportSettings.unitSystem === 'imperial'
    ? 'INCHES'
    : `METRIC (${viewportSettings.metricUnit.toUpperCase()})`;

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
        {filterBasinText && (
          <div className="measurements-pill filter-basin-pill" id="status-filter-basin">
            <span className="basin-dot" />
            <span>{filterBasinText}</span>
          </div>
        )}
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
          onClick={cycleUnitSystem}
          title="Toggle Unit System (mm / cm / in)"
        >
          <Globe size={12} />
          <span>{unitLabel}</span>
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
