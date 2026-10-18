import React, { useMemo } from 'react';
import {
  Sliders,
  Move,
  RotateCw,
  Maximize2,
  Palette,
  Layers,
  Activity,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Lock,
  Unlock,
  X,
  RotateCcw,
  Box,
  Plus,
  AlertTriangle,
  Scissors,
  ArrowRight,
  Sparkles,
  Unlink,
  Radio,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  UnfoldVertical,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import {
  toDisplayUnits,
  fromDisplayUnits,
  calculateChambers,
  formatVolume,
  validateContainerDimensions,
  CONTAINER_LIMITS,
} from '../../utils/filterGeometry';
import {
  getComponentPorts,
  findEdgeForPort,
  getConnectedPartner,
  validateConnection,
} from '../../utils/connectionGraph';

export const RightSidebar: React.FC = () => {
  const {
    selectedObject,
    updateObject,
    toggleVisibility,
    toggleLock,
    deleteObject,
    duplicateObject,
    deselectObject,
    selectObject,
    transformMode,
    setTransformMode,
    snapSettings,
    toggleSnap,
    layoutSettings,
    simulation,
    objects,
    resizeFilterContainer,
    addDividerToContainer,
    setMetricUnit,
    setContainerViewMode,
    toggleExplodedView,
    viewportSettings,
    connections,
    activeConnectingPort,
    connectPorts,
    disconnectPorts,
    startConnecting,
    cancelConnecting,
    graphAnalysis,
  } = useEditor();

  if (!layoutSettings.rightSidebarOpen) {
    return null;
  }

  // Check component roles
  const isContainer =
    selectedObject?.componentType === 'filter-container' ||
    selectedObject?.id === 'obj-filter-container';

  const isDivider =
    selectedObject?.componentType === 'internal-divider' ||
    selectedObject?.id.includes('divider') ||
    selectedObject?.id.includes('baffle');

  // Find parent container if divider is selected
  const parentContainer = useMemo(() => {
    return objects.find(
      (o) => o.componentType === 'filter-container' || o.id === 'obj-filter-container'
    );
  }, [objects]);

  const activeContainer = isContainer ? selectedObject : parentContainer;

  // Real-time chamber calculation
  const chambersConfig = useMemo(() => {
    if (!activeContainer) return null;
    return calculateChambers(activeContainer, objects);
  }, [activeContainer, objects]);

  // Dimension validation
  const containerValidation = useMemo(() => {
    if (!isContainer || !selectedObject) {
      return { valid: true, clamped: { x: 0, y: 0, z: 0 } };
    }
    return validateContainerDimensions(selectedObject.dimensions);
  }, [isContainer, selectedObject]);

  // Ports for the selected component
  const selectedPorts = useMemo(() => {
    return selectedObject ? getComponentPorts(selectedObject) : [];
  }, [selectedObject]);

  const connectedPortsCount = useMemo(() => {
    if (!selectedObject || selectedPorts.length === 0) return 0;
    return selectedPorts.filter((p) => findEdgeForPort(connections, selectedObject.id, p.id)).length;
  }, [selectedObject, selectedPorts, connections]);

  // Predefined color swatches for quick CAD aesthetic styling
  const COLOR_SWATCHES = [
    '#334155', // Slate Dark
    '#0284c7', // Ocean Blue
    '#00b4d8', // Cyan Water
    '#10b981', // Aquatic Emerald
    '#f59e0b', // Amber Resin
    '#cbd5e1', // Ceramic White
    '#1e293b', // Activated Carbon
    '#475569', // River Stone
  ];

  return (
    <aside id="cad-right-sidebar" className="cad-sidebar cad-sidebar-right">
      <div className="inspector-header">
        <Sliders size={15} />
        <span>Properties Inspector</span>
      </div>

      <div className="inspector-content">
        {selectedObject ? (
          <>
            {/* 1. Object Identity & Action Header */}
            <div className="inspector-card">
              <div className="object-header-row">
                <input
                  id="input-object-name"
                  type="text"
                  value={selectedObject.name}
                  onChange={(e) =>
                    updateObject(selectedObject.id, { name: e.target.value })
                  }
                  className="object-name-input"
                  title="Rename Object"
                />

                <div className="object-badge-row">
                  <div className="badge-tag-wrapper">
                    <span className="category-tag">{selectedObject.category}</span>
                    {selectedObject.componentType && (
                      <span className="component-type-tag">{selectedObject.componentType}</span>
                    )}
                    {selectedObject.locked && (
                      <span className="locked-badge">
                        <Lock size={10} /> Locked
                      </span>
                    )}
                  </div>

                  <div className="object-actions-cluster">
                    {/* Lock Toggle */}
                    <button
                      id="btn-inspector-lock"
                      className={`icon-mini-btn ${selectedObject.locked ? 'active' : ''}`}
                      onClick={() => toggleLock(selectedObject.id)}
                      title={selectedObject.locked ? 'Unlock Object (Allow Move)' : 'Lock Object (Prevent Move)'}
                    >
                      {selectedObject.locked ? <Lock size={13} className="text-amber-400" /> : <Unlock size={13} />}
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      id="btn-inspector-visibility"
                      className="icon-mini-btn"
                      onClick={() => toggleVisibility(selectedObject.id)}
                      title={selectedObject.visible ? 'Hide Object' : 'Show Object'}
                    >
                      {selectedObject.visible ? <Eye size={13} /> : <EyeOff size={13} className="text-rose-400" />}
                    </button>

                    {/* Duplicate Object */}
                    <button
                      id="btn-inspector-duplicate"
                      className="icon-mini-btn"
                      onClick={() => duplicateObject(selectedObject.id)}
                      title="Duplicate Object (Ctrl+D)"
                    >
                      <Copy size={13} />
                    </button>

                    {/* Delete Object */}
                    {!selectedObject.locked && (
                      <button
                        id="btn-inspector-delete"
                        className="icon-mini-btn hover-danger"
                        onClick={() => deleteObject(selectedObject.id)}
                        title="Delete Object (Del)"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    {/* Deselect */}
                    <button
                      id="btn-inspector-deselect"
                      className="icon-mini-btn"
                      onClick={deselectObject}
                      title="Deselect (Esc)"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Transform Gizmo Mode Selector & Snapping */}
            <div className="inspector-section">
              <div className="section-label">
                <Move size={13} />
                <span>Transform Tool & Snapping</span>
              </div>

              <div className="transform-mode-row">
                <button
                  id="btn-inspector-mode-translate"
                  className={`mode-pill ${transformMode === 'translate' ? 'active' : ''}`}
                  onClick={() => setTransformMode('translate')}
                  title="Move / Translate Mode (W)"
                >
                  <Move size={12} />
                  <span>Move</span>
                </button>
                <button
                  id="btn-inspector-mode-rotate"
                  className={`mode-pill ${transformMode === 'rotate' ? 'active' : ''}`}
                  onClick={() => setTransformMode('rotate')}
                  title="Rotate Mode (E)"
                >
                  <RotateCw size={12} />
                  <span>Rotate</span>
                </button>
                <button
                  id="btn-inspector-mode-scale"
                  className={`mode-pill ${transformMode === 'scale' ? 'active' : ''}`}
                  onClick={() => setTransformMode('scale')}
                  title="Scale / Resize Mode (R)"
                >
                  <Maximize2 size={12} />
                  <span>Resize</span>
                </button>
              </div>

              {/* Snap Settings Bar */}
              <div className="snap-setting-row">
                <button
                  id="btn-inspector-toggle-snap"
                  className={`snap-chip ${snapSettings.enabled ? 'active' : ''}`}
                  onClick={toggleSnap}
                >
                  <span>GRID SNAP: {snapSettings.enabled ? 'ON' : 'OFF'}</span>
                </button>
                <span className="snap-spec-label">
                  Step: {snapSettings.translationSnap}m / {snapSettings.rotationSnapDeg}°
                </span>
              </div>
            </div>

            {/* 3. Transform Coordinates: Position, Rotation, Dimensions */}
            <div className="inspector-section">
              <div className="section-header-split">
                <div className="section-label">
                  <span>Spatial Coordinates</span>
                </div>
                <button
                  id="btn-reset-rotation"
                  className="mini-text-btn"
                  onClick={() =>
                    updateObject(selectedObject.id, {
                      rotation: { x: 0, y: 0, z: 0 },
                    })
                  }
                  title="Reset Rotation to (0, 0, 0)"
                >
                  <RotateCcw size={11} />
                  <span>Reset Rot</span>
                </button>
              </div>

              {/* Position Coordinates */}
              <div className="coord-group">
                <span className="coord-group-title">Position (X, Y, Z)</span>
                <div className="coordinate-grid">
                  <div className="coord-field">
                    <label>X (Pos)</label>
                    <input
                      id="input-pos-x"
                      type="number"
                      step={snapSettings.enabled ? snapSettings.translationSnap : 0.05}
                      value={selectedObject.position.x}
                      onChange={(e) =>
                        updateObject(selectedObject.id, {
                          position: {
                            ...selectedObject.position,
                            x: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="coord-input"
                    />
                  </div>
                  <div className="coord-field">
                    <label>Y (Height)</label>
                    <input
                      id="input-pos-y"
                      type="number"
                      step={snapSettings.enabled ? snapSettings.translationSnap : 0.05}
                      value={selectedObject.position.y}
                      onChange={(e) =>
                        updateObject(selectedObject.id, {
                          position: {
                            ...selectedObject.position,
                            y: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="coord-input"
                    />
                  </div>
                  <div className="coord-field">
                    <label>Z (Depth)</label>
                    <input
                      id="input-pos-z"
                      type="number"
                      step={snapSettings.enabled ? snapSettings.translationSnap : 0.05}
                      value={selectedObject.position.z}
                      onChange={(e) =>
                        updateObject(selectedObject.id, {
                          position: {
                            ...selectedObject.position,
                            z: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="coord-input"
                    />
                  </div>
                </div>
              </div>

              {/* Rotation Angles (in Degrees) */}
              <div className="coord-group">
                <span className="coord-group-title">Rotation (Degrees)</span>
                <div className="coordinate-grid">
                  <div className="coord-field">
                    <label>Rot X°</label>
                    <input
                      id="input-rot-x"
                      type="number"
                      step={snapSettings.enabled ? snapSettings.rotationSnapDeg : 5}
                      value={selectedObject.rotation?.x || 0}
                      onChange={(e) =>
                        updateObject(selectedObject.id, {
                          rotation: {
                            x: parseFloat(e.target.value) || 0,
                            y: selectedObject.rotation?.y || 0,
                            z: selectedObject.rotation?.z || 0,
                          },
                        })
                      }
                      className="coord-input"
                    />
                  </div>
                  <div className="coord-field">
                    <label>Rot Y°</label>
                    <input
                      id="input-rot-y"
                      type="number"
                      step={snapSettings.enabled ? snapSettings.rotationSnapDeg : 5}
                      value={selectedObject.rotation?.y || 0}
                      onChange={(e) =>
                        updateObject(selectedObject.id, {
                          rotation: {
                            x: selectedObject.rotation?.x || 0,
                            y: parseFloat(e.target.value) || 0,
                            z: selectedObject.rotation?.z || 0,
                          },
                        })
                      }
                      className="coord-input"
                    />
                  </div>
                  <div className="coord-field">
                    <label>Rot Z°</label>
                    <input
                      id="input-rot-z"
                      type="number"
                      step={snapSettings.enabled ? snapSettings.rotationSnapDeg : 5}
                      value={selectedObject.rotation?.z || 0}
                      onChange={(e) =>
                        updateObject(selectedObject.id, {
                          rotation: {
                            x: selectedObject.rotation?.x || 0,
                            y: selectedObject.rotation?.y || 0,
                            z: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="coord-input"
                    />
                  </div>
                </div>
              </div>

              {/* Dimensions (Length, Width, Height) */}
              {isContainer ? (
                <div className="coord-group container-geometry-group">
                  <div className="container-dim-header">
                    <span className="coord-group-title">Container Geometry</span>
                    {viewportSettings.unitSystem === 'metric' && (
                      <div className="unit-pill-selector">
                        <button
                          id="btn-unit-mm"
                          className={`unit-pill ${viewportSettings.metricUnit === 'mm' ? 'active' : ''}`}
                          onClick={() => setMetricUnit('mm')}
                        >
                          mm
                        </button>
                        <button
                          id="btn-unit-cm"
                          className={`unit-pill ${viewportSettings.metricUnit === 'cm' ? 'active' : ''}`}
                          onClick={() => setMetricUnit('cm')}
                        >
                          cm
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="coordinate-grid">
                    <div className="coord-field">
                      <label>Width ({viewportSettings.unitSystem === 'imperial' ? 'in' : viewportSettings.metricUnit})</label>
                      <input
                        id="input-container-width"
                        type="number"
                        step={viewportSettings.metricUnit === 'mm' ? 10 : 1}
                        value={
                          toDisplayUnits(
                            selectedObject.dimensions.x,
                            viewportSettings.unitSystem,
                            viewportSettings.metricUnit
                          ).value
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const meter = fromDisplayUnits(
                            val,
                            viewportSettings.unitSystem,
                            viewportSettings.metricUnit
                          );
                          resizeFilterContainer(selectedObject.id, {
                            ...selectedObject.dimensions,
                            x: meter,
                          });
                        }}
                        className={`coord-input ${!containerValidation.valid && selectedObject.dimensions.x < CONTAINER_LIMITS.minWidth ? 'input-error' : ''}`}
                      />
                    </div>
                    <div className="coord-field">
                      <label>Height ({viewportSettings.unitSystem === 'imperial' ? 'in' : viewportSettings.metricUnit})</label>
                      <input
                        id="input-container-height"
                        type="number"
                        step={viewportSettings.metricUnit === 'mm' ? 10 : 1}
                        value={
                          toDisplayUnits(
                            selectedObject.dimensions.y,
                            viewportSettings.unitSystem,
                            viewportSettings.metricUnit
                          ).value
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const meter = fromDisplayUnits(
                            val,
                            viewportSettings.unitSystem,
                            viewportSettings.metricUnit
                          );
                          resizeFilterContainer(selectedObject.id, {
                            ...selectedObject.dimensions,
                            y: meter,
                          });
                        }}
                        className={`coord-input ${!containerValidation.valid && selectedObject.dimensions.y < CONTAINER_LIMITS.minHeight ? 'input-error' : ''}`}
                      />
                    </div>
                    <div className="coord-field">
                      <label>Depth ({viewportSettings.unitSystem === 'imperial' ? 'in' : viewportSettings.metricUnit})</label>
                      <input
                        id="input-container-depth"
                        type="number"
                        step={viewportSettings.metricUnit === 'mm' ? 10 : 1}
                        value={
                          toDisplayUnits(
                            selectedObject.dimensions.z,
                            viewportSettings.unitSystem,
                            viewportSettings.metricUnit
                          ).value
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const meter = fromDisplayUnits(
                            val,
                            viewportSettings.unitSystem,
                            viewportSettings.metricUnit
                          );
                          resizeFilterContainer(selectedObject.id, {
                            ...selectedObject.dimensions,
                            z: meter,
                          });
                        }}
                        className={`coord-input ${!containerValidation.valid && selectedObject.dimensions.z < CONTAINER_LIMITS.minDepth ? 'input-error' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Validation Feedback Banner */}
                  {!containerValidation.valid ? (
                    <div className="dimension-validation-banner error">
                      <AlertTriangle size={13} className="text-amber-400" />
                      <div className="val-text">
                        <span>{containerValidation.error}</span>
                        <button
                          className="clamp-btn"
                          onClick={() =>
                            resizeFilterContainer(selectedObject.id, containerValidation.clamped)
                          }
                        >
                          Auto-Clamp Bounds
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="dimension-validation-banner valid">
                      <Sparkles size={11} className="text-emerald-400" />
                      <span>
                        Valid Basin Envelope: {toDisplayUnits(CONTAINER_LIMITS.minWidth, viewportSettings.unitSystem, viewportSettings.metricUnit).formatted} – {toDisplayUnits(CONTAINER_LIMITS.maxWidth, viewportSettings.unitSystem, viewportSettings.metricUnit).formatted}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="coord-group">
                  <span className="coord-group-title">Dimensions (L × W × H)</span>
                  <div className="coordinate-grid">
                    <div className="coord-field">
                      <label>L (Size)</label>
                      <input
                        id="input-dim-x"
                        type="number"
                        step={snapSettings.enabled ? snapSettings.scaleSnap : 0.05}
                        min="0.05"
                        value={selectedObject.dimensions.x}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            dimensions: {
                              ...selectedObject.dimensions,
                              x: Math.max(0.05, parseFloat(e.target.value) || 0.05),
                            },
                          })
                        }
                        className="coord-input"
                      />
                    </div>
                    <div className="coord-field">
                      <label>W (Width)</label>
                      <input
                        id="input-dim-z"
                        type="number"
                        step={snapSettings.enabled ? snapSettings.scaleSnap : 0.05}
                        min="0.05"
                        value={selectedObject.dimensions.z}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            dimensions: {
                              ...selectedObject.dimensions,
                              z: Math.max(0.05, parseFloat(e.target.value) || 0.05),
                            },
                          })
                        }
                        className="coord-input"
                      />
                    </div>
                    <div className="coord-field">
                      <label>H (Depth)</label>
                      <input
                        id="input-dim-y"
                        type="number"
                        step={snapSettings.enabled ? snapSettings.scaleSnap : 0.05}
                        min="0.05"
                        value={selectedObject.dimensions.y}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            dimensions: {
                              ...selectedObject.dimensions,
                              y: Math.max(0.05, parseFloat(e.target.value) || 0.05),
                            },
                          })
                        }
                        className="coord-input"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Plumbing Ports & Connection Graph */}
            {selectedPorts.length > 0 && (
              <div className="inspector-card" id="inspector-plumbing-card">
                <div className="card-section-title">
                  <div className="title-left">
                    <GitBranch size={13} className="text-emerald-400" />
                    <span>Plumbing Ports & Graph</span>
                  </div>
                  <span className="card-badge">
                    {connectedPortsCount} / {selectedPorts.length} Connected
                  </span>
                </div>

                {/* Ports List */}
                <div className="ports-inspector-list">
                  {selectedPorts.map((port) => {
                    const edge = findEdgeForPort(connections, selectedObject.id, port.id);
                    const isConnected = !!edge;
                    const partner = edge
                      ? getConnectedPartner(edge, selectedObject.id, port.id)
                      : null;
                    const partnerObj = partner
                      ? objects.find((o) => o.id === partner.componentId)
                      : null;
                    const partnerPorts = partnerObj ? getComponentPorts(partnerObj) : [];
                    const partnerPort = partnerPorts.find((p) => p.id === partner?.portId);

                    // Find available open compatible ports in the scene for quick-connect
                    const compatibleOpenTargets = objects.flatMap((otherObj) => {
                      if (otherObj.id === selectedObject.id || !otherObj.visible) return [];
                      const otherPorts = getComponentPorts(otherObj);
                      return otherPorts
                        .filter((p) => !findEdgeForPort(connections, otherObj.id, p.id))
                        .filter(
                          (p) =>
                            validateConnection(
                              selectedObject,
                              port,
                              otherObj,
                              p,
                              connections
                            ).valid
                        )
                        .map((p) => ({
                          targetObj: otherObj,
                          targetPort: p,
                        }));
                    });

                    const isConnectingThis =
                      activeConnectingPort?.componentId === selectedObject.id &&
                      activeConnectingPort?.portId === port.id;

                    return (
                      <div
                        key={port.id}
                        className={`port-item-card ${isConnected ? 'connected' : 'open'}`}
                      >
                        <div className="port-header-line">
                          <span className={`port-direction-pill dir-${port.direction}`}>
                            {port.direction.toUpperCase()}
                          </span>
                          <strong className="port-title">{port.name}</strong>
                          <span className="port-type-tag">{port.type}</span>
                        </div>

                        {isConnected ? (
                          <div className="port-connected-box">
                            <div className="connected-details">
                              <CheckCircle2 size={12} className="text-emerald-400" />
                              <span>
                                Linked: <strong>{partnerObj?.name || partner?.componentId}</strong>{' '}
                                ({partnerPort?.name || partner?.portId})
                              </span>
                            </div>
                            <button
                              id={`btn-disconnect-${port.id}`}
                              className="cad-disconnect-btn"
                              onClick={() => disconnectPorts(selectedObject.id, port.id)}
                              title="Disconnect this pipe endpoint"
                            >
                              <Unlink size={11} />
                              <span>Disconnect</span>
                            </button>
                          </div>
                        ) : (
                          <div className="port-open-box">
                            <div className="open-notice">
                              <AlertCircle size={12} className="text-amber-400" />
                              <span>Open Port (Unconnected)</span>
                            </div>

                            {/* Quick Connect Dropdown & Actions */}
                            <div className="quick-connect-row">
                              {compatibleOpenTargets.length > 0 ? (
                                <div className="quick-connect-controls">
                                  <select
                                    id={`select-connect-target-${port.id}`}
                                    className="cad-port-select"
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (!e.target.value) return;
                                      const [targetCompId, targetPortId] = e.target.value.split('::');
                                      const res = connectPorts(
                                        selectedObject.id,
                                        port.id,
                                        targetCompId,
                                        targetPortId
                                      );
                                      if (!res.success && res.message) {
                                        alert(res.message);
                                      }
                                    }}
                                  >
                                    <option value="">-- Quick Snap to Open Port --</option>
                                    {compatibleOpenTargets.map(({ targetObj, targetPort: tPort }) => (
                                      <option
                                        key={`${targetObj.id}::${tPort.id}`}
                                        value={`${targetObj.id}::${tPort.id}`}
                                      >
                                        {targetObj.name} → {tPort.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <div className="no-compatible-ports-hint">
                                  No compatible open ports found in scene. Add another pipe or pump from library.
                                </div>
                              )}

                              <button
                                id={`btn-start-connect-${port.id}`}
                                className={`cad-start-connect-btn ${isConnectingThis ? 'active' : ''}`}
                                onClick={() => {
                                  if (isConnectingThis) cancelConnecting();
                                  else startConnecting(selectedObject.id, port.id);
                                }}
                              >
                                <Radio size={12} />
                                <span>{isConnectingThis ? 'Cancel Connection' : '3D Click-to-Connect'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Local & System Plumbing Diagnostics */}
                <div className="plumbing-diagnostics-section">
                  <div className="diag-header">
                    <Activity size={12} className="text-cyan-400" />
                    <span>Graph Model Diagnostics</span>
                  </div>

                  <div className="diag-metrics-grid">
                    <div className="diag-metric">
                      <span className="lbl">Total Edges</span>
                      <strong className="val">{graphAnalysis.connectedEdgeCount}</strong>
                    </div>
                    <div className="diag-metric">
                      <span className="lbl">Open Ports</span>
                      <strong className={`val ${graphAnalysis.openPortCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {graphAnalysis.openPortCount}
                      </strong>
                    </div>
                    <div className="diag-metric">
                      <span className="lbl">Flow Paths</span>
                      <strong className="val text-cyan-400">{graphAnalysis.chains.length}</strong>
                    </div>
                  </div>

                  {graphAnalysis.issues.filter((i) => i.componentId === selectedObject.id).length > 0 && (
                    <div className="component-issues-list">
                      {graphAnalysis.issues
                        .filter((i) => i.componentId === selectedObject.id)
                        .map((issue, idx) => (
                          <div key={idx} className={`diag-issue-item ${issue.severity}`}>
                            <AlertTriangle size={12} />
                            <span>{issue.message}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="graph-model-disclaimer">
                    <span>* Graph-based topological connection model validated. Hydrodynamic flow velocities will calculate in next phase.</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Material & Visual Properties */}
            <div className="inspector-section">
              <div className="section-label">
                <Palette size={13} />
                <span>Material & Appearance</span>
              </div>

              {/* Color Picker & Swatches */}
              <div className="field-row">
                <label className="field-label">Object Tint</label>
                <div className="color-picker-group">
                  <input
                    id="input-material-color"
                    type="color"
                    value={selectedObject.material.color}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        material: {
                          ...selectedObject.material,
                          color: e.target.value,
                        },
                      })
                    }
                    className="color-input"
                  />
                  <div className="swatch-list">
                    {COLOR_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        className={`swatch-btn ${selectedObject.material.color.toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() =>
                          updateObject(selectedObject.id, {
                            material: { ...selectedObject.material, color: hex },
                          })
                        }
                        title={hex}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="field-slider-group">
                <div className="slider-header">
                  <label>Opacity / Transparency</label>
                  <span>{Math.round(selectedObject.material.opacity * 100)}%</span>
                </div>
                <input
                  id="slider-material-opacity"
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={selectedObject.material.opacity}
                  onChange={(e) =>
                    updateObject(selectedObject.id, {
                      material: {
                        ...selectedObject.material,
                        opacity: parseFloat(e.target.value),
                        transparent: parseFloat(e.target.value) < 0.98,
                      },
                    })
                  }
                  className="cad-range-slider"
                />
              </div>

              {/* Roughness Slider */}
              <div className="field-slider-group">
                <div className="slider-header">
                  <label>Surface Roughness</label>
                  <span>{Math.round(selectedObject.material.roughness * 100)}%</span>
                </div>
                <input
                  id="slider-material-roughness"
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={selectedObject.material.roughness}
                  onChange={(e) =>
                    updateObject(selectedObject.id, {
                      material: {
                        ...selectedObject.material,
                        roughness: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="cad-range-slider"
                />
              </div>
            </div>

            {/* 5. Component-Specific Parameters */}
            <div className="inspector-section">
              <div className="section-label">
                <Layers size={13} />
                <span>Component Parameters</span>
              </div>

              {/* If FILTER selected */}
              {selectedObject.category === 'filter' && (
                <div className="params-stack">
                  {/* CASE 1: Filter Container Basin */}
                  {isContainer ? (
                    <div className="filter-basin-editor-stack">
                      {/* Viewing Mode Selector (Transparent, Opaque, Cutaway) */}
                      <div className="param-subgroup">
                        <label className="subgroup-title">Basin Viewing Mode</label>
                        <div className="view-mode-selector-row">
                          <button
                            id="btn-view-mode-transparent"
                            className={`mode-btn ${viewportSettings.containerViewMode === 'transparent' ? 'active' : ''}`}
                            onClick={() => setContainerViewMode('transparent')}
                            title="Clear Acrylic Basin Walls"
                          >
                            <Eye size={13} />
                            <span>Transparent</span>
                          </button>
                          <button
                            id="btn-view-mode-opaque"
                            className={`mode-btn ${viewportSettings.containerViewMode === 'opaque' ? 'active' : ''}`}
                            onClick={() => setContainerViewMode('opaque')}
                            title="Solid Technical Engineering Polymer"
                          >
                            <Box size={13} />
                            <span>Opaque</span>
                          </button>
                          <button
                            id="btn-view-mode-cutaway"
                            className={`mode-btn ${viewportSettings.containerViewMode === 'cutaway' ? 'active' : ''}`}
                            onClick={() => setContainerViewMode('cutaway')}
                            title="Cutaway Cross-Section Inspection"
                          >
                            <Scissors size={13} />
                            <span>Cutaway</span>
                          </button>
                          <button
                            id="btn-view-mode-exploded"
                            className={`mode-btn ${viewportSettings.explodedView ? 'active' : ''}`}
                            onClick={toggleExplodedView}
                            title="Exploded Assembly View (Disassemble baffles & media)"
                          >
                            <UnfoldVertical size={13} />
                            <span>Exploded</span>
                          </button>
                        </div>
                      </div>

                      {/* Chambers & Usable Volume Breakdown */}
                      <div className="param-subgroup">
                        <div className="chambers-header-row">
                          <div className="chambers-label">
                            <Layers size={13} />
                            <span>Chambers & Usable Volume</span>
                          </div>
                          <button
                            id="btn-add-chamber-divider"
                            className="add-divider-action-btn"
                            onClick={() => addDividerToContainer(selectedObject.id)}
                            title="Split widest chamber with a new acrylic divider baffle"
                          >
                            <Plus size={12} />
                            <span>Add Divider</span>
                          </button>
                        </div>

                        {chambersConfig && (
                          <>
                            <div className="chambers-summary-bar">
                              <div className="summary-item">
                                <span className="label">Total Usable Fluid:</span>
                                <strong className="val text-cyan-400">
                                  {formatVolume(chambersConfig.totalInternalVolumeLiters, viewportSettings.unitSystem)}
                                </strong>
                              </div>
                              <div className="summary-item">
                                <span className="label">Chambers:</span>
                                <strong className="val">
                                  {chambersConfig.chambers.length} Stages
                                </strong>
                              </div>
                            </div>

                            <div className="chambers-list">
                              {chambersConfig.chambers.map((ch) => (
                                <div key={ch.index} className="chamber-card">
                                  <div className="chamber-card-top">
                                    <span className="chamber-card-name">
                                      Chamber {ch.index}
                                    </span>
                                    <span className={`stage-tag stage-${ch.assignedStage || 'mechanical'}`}>
                                      {ch.assignedStage?.toUpperCase() || 'STAGE'}
                                    </span>
                                  </div>
                                  <div className="chamber-card-metrics">
                                    <div className="metric">
                                      <span className="metric-label">Usable Vol</span>
                                      <span className="metric-value text-cyan-300">
                                        {formatVolume(ch.volumeLiters, viewportSettings.unitSystem)}
                                      </span>
                                    </div>
                                    <div className="metric">
                                      <span className="metric-label">Chamber Width</span>
                                      <span className="metric-value">
                                        {toDisplayUnits(ch.width, viewportSettings.unitSystem, viewportSettings.metricUnit).formatted}
                                      </span>
                                    </div>
                                    <div className="metric">
                                      <span className="metric-label">X-Bounds</span>
                                      <span className="metric-value font-mono">
                                        {ch.startX.toFixed(2)}m → {ch.endX.toFixed(2)}m
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : isDivider ? (
                    /* CASE 2: Internal Divider (Baffle) Controls */
                    <div className="divider-editor-stack">
                      <div className="divider-card-header">
                        <span className="divider-badge">Internal Chamber Baffle</span>
                        {parentContainer && (
                          <button
                            id="btn-select-parent-container"
                            className="link-btn"
                            onClick={() => selectObject(parentContainer.id)}
                            title="Select Parent Filter Basin"
                          >
                            Filter Basin <ArrowRight size={11} />
                          </button>
                        )}
                      </div>

                      {/* Horizontal X-Position Slider clamped inside container */}
                      {parentContainer && (
                        <div className="field-slider-group">
                          <div className="slider-header">
                            <label>Divider Position (X-Axis)</label>
                            <span className="font-mono text-cyan-400">
                              {toDisplayUnits(selectedObject.position.x, viewportSettings.unitSystem, viewportSettings.metricUnit).formatted}
                            </span>
                          </div>
                          <input
                            id="slider-divider-x-position"
                            type="range"
                            min={(parentContainer.position.x - parentContainer.dimensions.x / 2 + 0.08).toFixed(3)}
                            max={(parentContainer.position.x + parentContainer.dimensions.x / 2 - 0.08).toFixed(3)}
                            step="0.01"
                            value={selectedObject.position.x}
                            onChange={(e) => {
                              const newX = parseFloat(e.target.value);
                              updateObject(selectedObject.id, {
                                position: { ...selectedObject.position, x: newX },
                              });
                            }}
                            className="cad-range-slider"
                          />
                        </div>
                      )}

                      {/* Underflow Gap Slider */}
                      <div className="field-slider-group">
                        <div className="slider-header">
                          <label>Underflow Slot Clearance</label>
                          <span className="font-mono text-emerald-400">
                            {(selectedObject.parameters.underflowGapMm as number) || 15} mm
                          </span>
                        </div>
                        <input
                          id="slider-divider-underflow"
                          type="range"
                          min="5"
                          max="60"
                          step="5"
                          value={(selectedObject.parameters.underflowGapMm as number) || 15}
                          onChange={(e) => {
                            const gap = parseInt(e.target.value, 10);
                            updateObject(selectedObject.id, {
                              parameters: {
                                ...selectedObject.parameters,
                                underflowGapMm: gap,
                              },
                            });
                          }}
                          className="cad-range-slider"
                        />
                      </div>
                    </div>
                  ) : (
                    /* CASE 3: Standard Filter Pump */
                    <>
                      <div className="field-slider-group">
                        <div className="slider-header">
                          <label>Pump Flow Rate</label>
                          <span className="text-cyan-400 font-mono">
                            {(selectedObject.parameters.flowRateGPH as number) || 150} GPH
                          </span>
                        </div>
                        <input
                          id="slider-filter-flow"
                          type="range"
                          min="30"
                          max="600"
                          step="10"
                          value={(selectedObject.parameters.flowRateGPH as number) || 150}
                          onChange={(e) =>
                            updateObject(selectedObject.id, {
                              parameters: {
                                ...selectedObject.parameters,
                                flowRateGPH: parseInt(e.target.value, 10),
                              },
                            })
                          }
                          className="cad-range-slider"
                        />
                      </div>

                      <div className="field-toggle-row">
                        <label>Impeller Motor State</label>
                        <button
                          id="btn-toggle-filter-motor"
                          className={`cad-switch-btn ${selectedObject.parameters.motorStatus !== false ? 'on' : 'off'}`}
                          onClick={() =>
                            updateObject(selectedObject.id, {
                              parameters: {
                                ...selectedObject.parameters,
                                motorStatus: selectedObject.parameters.motorStatus === false,
                              },
                            })
                          }
                        >
                          {selectedObject.parameters.motorStatus !== false ? 'ACTIVE' : 'OFF'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* If WATER selected */}
              {selectedObject.category === 'water' && (
                <div className="params-stack">
                  <div className="field-slider-group">
                    <div className="slider-header">
                      <label>Water Temperature</label>
                      <span className="text-cyan-400 font-mono">
                        {(selectedObject.parameters.temperatureC as number) || 25}°C
                      </span>
                    </div>
                    <input
                      id="slider-water-temp"
                      type="range"
                      min="18"
                      max="32"
                      step="0.5"
                      value={(selectedObject.parameters.temperatureC as number) || 25}
                      onChange={(e) => {
                        const c = parseFloat(e.target.value);
                        const f = parseFloat((c * 1.8 + 32).toFixed(1));
                        updateObject(selectedObject.id, {
                          parameters: {
                            ...selectedObject.parameters,
                            temperatureC: c,
                            temperatureF: f,
                          },
                        });
                      }}
                      className="cad-range-slider"
                    />
                  </div>

                  <div className="field-slider-group">
                    <div className="slider-header">
                      <label>Water Clarity Index</label>
                      <span className="text-emerald-400 font-mono">
                        {(selectedObject.parameters.clarityPercent as number) || 94}%
                      </span>
                    </div>
                    <input
                      id="slider-water-clarity"
                      type="range"
                      min="50"
                      max="100"
                      step="1"
                      value={(selectedObject.parameters.clarityPercent as number) || 94}
                      onChange={(e) =>
                        updateObject(selectedObject.id, {
                          parameters: {
                            ...selectedObject.parameters,
                            clarityPercent: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      className="cad-range-slider"
                    />
                  </div>
                </div>
              )}

              {/* If MEDIA selected */}
              {selectedObject.category === 'media' && (
                <div className="params-stack">
                  <div className="field-slider-group">
                    <div className="slider-header">
                      <label>Media Saturation / Clogging</label>
                      <span className="text-amber-400 font-mono">
                        {(selectedObject.parameters.cloggedStatusPercent ||
                          selectedObject.parameters.saturationPercent ||
                          15) as number}
                        %
                      </span>
                    </div>
                    <input
                      id="slider-media-clogging"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={
                        (selectedObject.parameters.cloggedStatusPercent ||
                          selectedObject.parameters.saturationPercent ||
                          15) as number
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateObject(selectedObject.id, {
                          parameters: {
                            ...selectedObject.parameters,
                            cloggedStatusPercent: val,
                            saturationPercent: val,
                          },
                        });
                      }}
                      className="cad-range-slider"
                    />
                  </div>
                </div>
              )}

              {/* If AERATION selected */}
              {selectedObject.category === 'aeration' && (
                <div className="params-stack">
                  <div className="field-toggle-row">
                    <label>Aeration Plume</label>
                    <button
                      id="btn-toggle-bubble-plume"
                      className={`cad-switch-btn ${selectedObject.parameters.bubblePlumeActive !== false ? 'on' : 'off'}`}
                      onClick={() =>
                        updateObject(selectedObject.id, {
                          parameters: {
                            ...selectedObject.parameters,
                            bubblePlumeActive: selectedObject.parameters.bubblePlumeActive === false,
                          },
                        })
                      }
                    >
                      {selectedObject.parameters.bubblePlumeActive !== false ? 'DIFFUSING' : 'OFF'}
                    </button>
                  </div>
                </div>
              )}

              {/* If STRUCTURE / HARDSCAPE */}
              {(selectedObject.category === 'structure' ||
                selectedObject.category === 'hardscape') && (
                <div className="params-info-box">
                  <span className="info-badge">Solid Geometry</span>
                  <p>
                    {selectedObject.id === 'obj-tank-enclosure'
                      ? 'Primary containment frame. Dimensions dictate maximum aquarium water volume.'
                      : 'Physical hardscape element providing biological colonization surface and flow deflection.'}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty Selection State */
          <div className="empty-inspector-state">
            <div className="empty-icon-circle">
              <Activity size={24} className="text-cyan-400" />
            </div>
            <h4>Aquarium System Telemetry</h4>
            <p>Select any object in the 3D viewport or outliner to inspect and modify properties.</p>

            <div className="system-summary-list">
              <div className="summary-row">
                <span>Total Tank Capacity:</span>
                <strong>71.3 Gallons (270 L)</strong>
              </div>
              <div className="summary-row">
                <span>Total Filter Turnover:</span>
                <strong className="text-cyan-400">{simulation.calculatedTurnover}x / hr</strong>
              </div>
              <div className="summary-row">
                <span>Pump Flow Capacity:</span>
                <strong>{simulation.totalFlowGPH} GPH</strong>
              </div>
              <div className="summary-row">
                <span>Active Cycle Time:</span>
                <strong>+{Math.floor(simulation.simulatedMinutes)} mins</strong>
              </div>
              <div className="summary-row">
                <span>Plumbing Connections:</span>
                <strong className={graphAnalysis.isValid ? 'text-emerald-400' : 'text-amber-400'}>
                  {graphAnalysis.connectedEdgeCount} Edges ({graphAnalysis.openPortCount} Open)
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
