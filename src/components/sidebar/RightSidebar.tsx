import React from 'react';
import {
  Sliders,
  Move,
  Palette,
  Layers,
  Activity,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

export const RightSidebar: React.FC = () => {
  const {
    selectedObject,
    updateObject,
    toggleVisibility,
    deleteObject,
    layoutSettings,
    simulation,
  } = useEditor();

  if (!layoutSettings.rightSidebarOpen) {
    return null;
  }

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
            {/* 1. Object Identity Header */}
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
                  <span className="category-tag">{selectedObject.category}</span>
                  <button
                    id="btn-inspector-visibility"
                    className="icon-mini-btn"
                    onClick={() => toggleVisibility(selectedObject.id)}
                    title={selectedObject.visible ? 'Hide Object' : 'Show Object'}
                  >
                    {selectedObject.visible ? <Eye size={13} /> : <EyeOff size={13} className="text-rose-400" />}
                  </button>
                  {!selectedObject.locked && (
                    <button
                      id="btn-inspector-delete"
                      className="icon-mini-btn hover-danger"
                      onClick={() => deleteObject(selectedObject.id)}
                      title="Delete Object"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Transform & Sizing */}
            <div className="inspector-section">
              <div className="section-label">
                <Move size={13} />
                <span>Transform & Coordinates</span>
              </div>

              {/* Position Coordinates */}
              <div className="coordinate-grid">
                <div className="coord-field">
                  <label>X (Pos)</label>
                  <input
                    id="input-pos-x"
                    type="number"
                    step="0.1"
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
                    step="0.1"
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
                    step="0.1"
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

              {/* Dimensions */}
              <div className="coordinate-grid">
                <div className="coord-field">
                  <label>L (Size)</label>
                  <input
                    id="input-dim-x"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={selectedObject.dimensions.x}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        dimensions: {
                          ...selectedObject.dimensions,
                          x: Math.max(0.1, parseFloat(e.target.value) || 0.1),
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
                    step="0.1"
                    min="0.1"
                    value={selectedObject.dimensions.z}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        dimensions: {
                          ...selectedObject.dimensions,
                          z: Math.max(0.1, parseFloat(e.target.value) || 0.1),
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
                    step="0.1"
                    min="0.1"
                    value={selectedObject.dimensions.y}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        dimensions: {
                          ...selectedObject.dimensions,
                          y: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                        },
                      })
                    }
                    className="coord-input"
                  />
                </div>
              </div>
            </div>

            {/* 3. Material & Visual Properties */}
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

            {/* 4. Component-Specific Parameters */}
            <div className="inspector-section">
              <div className="section-label">
                <Layers size={13} />
                <span>Component Parameters</span>
              </div>

              {/* If FILTER selected */}
              {selectedObject.category === 'filter' && (
                <div className="params-stack">
                  <div className="field-slider-group">
                    <div className="slider-header">
                      <label>Pump Flow Rate</label>
                      <span className="text-cyan-400 font-mono">
                        {selectedObject.parameters.flowRateGPH} GPH
                      </span>
                    </div>
                    <input
                      id="slider-filter-flow"
                      type="range"
                      min="30"
                      max="600"
                      step="10"
                      value={selectedObject.parameters.flowRateGPH as number}
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
                </div>
              )}

              {/* If WATER selected */}
              {selectedObject.category === 'water' && (
                <div className="params-stack">
                  <div className="field-slider-group">
                    <div className="slider-header">
                      <label>Water Temperature</label>
                      <span className="text-cyan-400 font-mono">
                        {selectedObject.parameters.temperatureC}°C (
                        {selectedObject.parameters.temperatureF}°F)
                      </span>
                    </div>
                    <input
                      id="slider-water-temp"
                      type="range"
                      min="18"
                      max="32"
                      step="0.5"
                      value={selectedObject.parameters.temperatureC as number}
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
                        {selectedObject.parameters.clarityPercent}%
                      </span>
                    </div>
                    <input
                      id="slider-water-clarity"
                      type="range"
                      min="50"
                      max="100"
                      step="1"
                      value={selectedObject.parameters.clarityPercent as number}
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
          /* Empty Selection State: Display System Summary */
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
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
