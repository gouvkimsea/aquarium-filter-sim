import React, { useState } from 'react';
import {
  Camera,
  Sun,
  Moon,
  Layers,
  Eye,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Info,
} from 'lucide-react';
import type { SceneSettings, CameraPreset } from '../../types/scene';

interface Props {
  settings: SceneSettings;
  onUpdateSettings: (updater: (prev: SceneSettings) => SceneSettings) => void;
}

export const ControlPanel: React.FC<Props> = ({ settings, onUpdateSettings }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'guide'>('controls');

  const setCamera = (preset: CameraPreset) => {
    onUpdateSettings((prev) => ({ ...prev, cameraPreset: preset }));
  };

  const setLighting = (lightingPreset: SceneSettings['lightingPreset']) => {
    onUpdateSettings((prev) => ({ ...prev, lightingPreset }));
  };

  const toggleWireframe = () => {
    onUpdateSettings((prev) => ({ ...prev, wireframe: !prev.wireframe }));
  };

  const toggleHelpers = () => {
    onUpdateSettings((prev) => ({ ...prev, showHelpers: !prev.showHelpers }));
  };

  const setWaterOpacity = (val: number) => {
    onUpdateSettings((prev) => ({ ...prev, waterOpacity: val }));
  };

  return (
    <aside
      id="viewport-control-panel"
      className={`control-panel ${collapsed ? 'collapsed' : ''}`}
    >
      <button
        id="toggle-control-panel-btn"
        className="collapse-toggle-btn"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand Controls' : 'Collapse Controls'}
        title={collapsed ? 'Expand Controls' : 'Collapse Controls'}
      >
        {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      {!collapsed && (
        <div className="panel-inner">
          {/* Tab Navigation */}
          <div className="panel-tabs">
            <button
              id="tab-controls-btn"
              className={`panel-tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
              onClick={() => setActiveTab('controls')}
            >
              <Sliders size={15} />
              <span>3D Viewport Controls</span>
            </button>
            <button
              id="tab-guide-btn"
              className={`panel-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
              onClick={() => setActiveTab('guide')}
            >
              <Info size={15} />
              <span>Model Guide</span>
            </button>
          </div>

          {activeTab === 'controls' ? (
            <div className="panel-scrollable-content">
              {/* Camera Presets */}
              <div className="control-section">
                <label className="section-title">
                  <Camera size={14} />
                  <span>Camera Angles</span>
                </label>
                <div className="button-grid">
                  <button
                    id="camera-preset-default"
                    className={`preset-btn ${settings.cameraPreset === 'default' ? 'active' : ''}`}
                    onClick={() => setCamera('default')}
                  >
                    Perspective
                  </button>
                  <button
                    id="camera-preset-front"
                    className={`preset-btn ${settings.cameraPreset === 'front' ? 'active' : ''}`}
                    onClick={() => setCamera('front')}
                  >
                    Front Tank
                  </button>
                  <button
                    id="camera-preset-top"
                    className={`preset-btn ${settings.cameraPreset === 'top' ? 'active' : ''}`}
                    onClick={() => setCamera('top')}
                  >
                    Top Down
                  </button>
                  <button
                    id="camera-preset-side"
                    className={`preset-btn ${settings.cameraPreset === 'side' ? 'active' : ''}`}
                    onClick={() => setCamera('side')}
                  >
                    Side View
                  </button>
                  <button
                    id="camera-preset-filter"
                    className={`preset-btn full-width ${settings.cameraPreset === 'filter-closeup' ? 'active' : ''}`}
                    onClick={() => setCamera('filter-closeup')}
                  >
                    🔍 Filter Chamber Closeup
                  </button>
                </div>
              </div>

              {/* Lighting Preset */}
              <div className="control-section">
                <label className="section-title">
                  <Sun size={14} />
                  <span>Aquarium Lighting Preset</span>
                </label>
                <div className="lighting-preset-row">
                  <button
                    id="light-preset-daylight"
                    className={`light-btn ${settings.lightingPreset === 'daylight' ? 'active' : ''}`}
                    onClick={() => setLighting('daylight')}
                  >
                    <Sun size={14} />
                    <span>Daylight</span>
                  </button>
                  <button
                    id="light-preset-actinic"
                    className={`light-btn ${settings.lightingPreset === 'actinic' ? 'active' : ''}`}
                    onClick={() => setLighting('actinic')}
                  >
                    <Eye size={14} />
                    <span>Actinic Blue</span>
                  </button>
                  <button
                    id="light-preset-night"
                    className={`light-btn ${settings.lightingPreset === 'night' ? 'active' : ''}`}
                    onClick={() => setLighting('night')}
                  >
                    <Moon size={14} />
                    <span>Night Moon</span>
                  </button>
                </div>
              </div>

              {/* Rendering & Display Toggles */}
              <div className="control-section">
                <label className="section-title">
                  <Layers size={14} />
                  <span>Render Modes & Helpers</span>
                </label>
                <div className="toggle-row">
                  <button
                    id="toggle-wireframe-btn"
                    className={`toggle-chip ${settings.wireframe ? 'active' : ''}`}
                    onClick={toggleWireframe}
                  >
                    <span>Wireframe Mesh</span>
                    <span className="toggle-indicator">{settings.wireframe ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    id="toggle-helpers-btn"
                    className={`toggle-chip ${settings.showHelpers ? 'active' : ''}`}
                    onClick={toggleHelpers}
                  >
                    <span>3D World Grid</span>
                    <span className="toggle-indicator">{settings.showHelpers ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Water Opacity Slider */}
              <div className="control-section">
                <div className="slider-header">
                  <label className="section-title">Water Clarity / Opacity</label>
                  <span className="slider-val">{Math.round(settings.waterOpacity * 100)}%</span>
                </div>
                <input
                  id="water-opacity-slider"
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.05"
                  value={settings.waterOpacity}
                  onChange={(e) => setWaterOpacity(parseFloat(e.target.value))}
                  className="custom-range-slider"
                />
              </div>
            </div>
          ) : (
            <div className="panel-scrollable-content guide-content">
              <h4>Prototype 3D Architecture</h4>
              <p>
                This initial shell verifies the WebGL render pipeline, camera controls, and basic 3D model geometry before the full chemical simulation is hooked up:
              </p>
              <ul>
                <li>
                  <strong>Glass Tank Frame:</strong> Real-time physically based glass with refraction, reflection, and matte rim framing.
                </li>
                <li>
                  <strong>Hang-On-Back (HOB) Filter:</strong> Shows the intake pipe, 3 media compartments (Mechanical Blue Foam, Biological Ceramic Rings, Chemical Carbon), and waterfall return spillway.
                </li>
                <li>
                  <strong>Aeration Particles:</strong> Real-time animated bubble motes modeled with Three.js particle systems.
                </li>
                <li>
                  <strong>Aquascaped Substrate:</strong> Natural riverbed gravel bed and decorative aquascaping stones.
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
