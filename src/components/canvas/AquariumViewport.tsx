import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import {
  Move,
  RotateCw,
  Maximize2,
  Copy,
  Trash2,
  X,
  Plus,
  Target,
} from 'lucide-react';
import { Scene } from './Scene';
import { EnvironmentLighting } from './EnvironmentLighting';
import { TransformGizmo } from './TransformGizmo';
import { useEditor } from '../../context/EditorContext';
import type { CameraPreset, ComponentTemplate, EditorObject } from '../../types/editor';

interface ViewportProps {
  onContextLost?: () => void;
}

const CameraController: React.FC<{
  preset: CameraPreset;
  focusTrigger: number;
  selectedObject: EditorObject | null;
}> = ({ preset, focusTrigger, selectedObject }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    switch (preset) {
      case 'top':
        controls.object.position.set(2.2, 9.5, -1.75);
        controls.target.set(2.2, 1.4, -1.75);
        break;
      case 'front':
        controls.object.position.set(0, 0.8, 9.8);
        controls.target.set(0, 0.2, 0);
        break;
      case 'side':
        controls.object.position.set(9.8, 0.8, 0);
        controls.target.set(0, 0.2, 0);
        break;
      case 'left':
        controls.object.position.set(-9.8, 0.8, 0);
        controls.target.set(0, 0.2, 0);
        break;
      case 'back':
        controls.object.position.set(2.2, 1.8, -9.5);
        controls.target.set(2.2, 1.4, -1.75);
        break;
      case 'filter-closeup':
        controls.object.position.set(3.4, 2.4, -0.4);
        controls.target.set(2.2, 1.4, -1.75);
        break;
      case 'isometric':
      default:
        controls.object.position.set(6.8, 4.8, 7.8);
        controls.target.set(0, 0, 0);
        break;
    }
    controls.update();
  }, [preset]);

  // Frame / Focus selected object on trigger
  useEffect(() => {
    if (!controlsRef.current || focusTrigger === 0 || !selectedObject) return;
    const controls = controlsRef.current;
    const { x, y, z } = selectedObject.position;
    controls.target.set(x, y, z);
    const dimMax = Math.max(
      selectedObject.dimensions.x,
      selectedObject.dimensions.y,
      selectedObject.dimensions.z,
      0.6
    );
    const dist = Math.max(dimMax * 2.8, 1.8);
    controls.object.position.set(x + dist * 0.75, y + dist * 0.55, z + dist * 0.85);
    controls.update();
  }, [focusTrigger, selectedObject]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={1.8}
      maxDistance={28}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2 + 0.12}
    />
  );
};

export const AquariumViewport: React.FC<ViewportProps> = ({ onContextLost }) => {
  const {
    viewportSettings,
    updateViewportSettings,
    selectedObject,
    transformMode,
    setTransformMode,
    snapSettings,
    toggleSnap,
    duplicateObject,
    deleteObject,
    deselectObject,
    addComponentFromLibrary,
    focusTrigger,
    focusSelectedObject,
  } = useEditor();

  const [isDragOver, setIsDragOver] = useState(false);

  const setCameraPreset = (preset: CameraPreset) => {
    updateViewportSettings((prev) => ({ ...prev, cameraPreset: preset }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const tpl: ComponentTemplate = JSON.parse(data);

      const rect = e.currentTarget.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      const worldX = parseFloat((normX * 2.6).toFixed(2));
      const worldY = parseFloat((normY * 1.4).toFixed(2));
      const worldZ = 0.2;

      addComponentFromLibrary(tpl, { x: worldX, y: worldY, z: worldZ });
    } catch (err) {
      console.warn('Failed to parse dropped template:', err);
    }
  };

  return (
    <div
      id="aquarium-3d-viewport"
      className={`viewport-container ${isDragOver ? 'drag-over-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Dropzone Overlay */}
      {isDragOver && (
        <div className="viewport-drop-overlay">
          <div className="drop-target-badge">
            <Plus size={22} className="text-cyan-400" />
            <span>Drop to Place Component into 3D Tank</span>
          </div>
        </div>
      )}
      {/* 1. Floating In-Viewport Quick Camera Navigation Bar */}
      <div id="viewport-camera-hud" className="viewport-hud-bar">
        <button
          id="hud-cam-iso"
          className={`hud-cam-btn ${viewportSettings.cameraPreset === 'isometric' ? 'active' : ''}`}
          onClick={() => setCameraPreset('isometric')}
          title="Perspective 3D View"
        >
          3D ISO
        </button>
        <button
          id="hud-cam-top"
          className={`hud-cam-btn ${viewportSettings.cameraPreset === 'top' ? 'active' : ''}`}
          onClick={() => setCameraPreset('top')}
          title="Top Overhead View (Inspect Inside Container)"
        >
          TOP
        </button>
        <button
          id="hud-cam-front"
          className={`hud-cam-btn ${viewportSettings.cameraPreset === 'front' ? 'active' : ''}`}
          onClick={() => setCameraPreset('front')}
          title="Front Elevation View"
        >
          FRONT
        </button>
        <button
          id="hud-cam-side"
          className={`hud-cam-btn ${viewportSettings.cameraPreset === 'side' ? 'active' : ''}`}
          onClick={() => setCameraPreset('side')}
          title="Side Profile View"
        >
          SIDE
        </button>
        <button
          id="hud-cam-filter"
          className={`hud-cam-btn filter-btn ${viewportSettings.cameraPreset === 'filter-closeup' ? 'active' : ''}`}
          onClick={() => setCameraPreset('filter-closeup')}
          title="Inspect Transparent Filter Container Interior"
        >
          🔍 FILTER
        </button>
        <button
          id="hud-cam-focus"
          className={`hud-cam-btn focus-hud-btn ${selectedObject ? 'active' : 'disabled'}`}
          onClick={focusSelectedObject}
          disabled={!selectedObject}
          title={selectedObject ? `Frame Camera on ${selectedObject.name} (F)` : 'Select an object to focus camera (F)'}
        >
          🎯 FOCUS (F)
        </button>
      </div>

      {/* 2. Floating Transform Controls & Selection Action Bar (Top Left) */}
      <div id="viewport-transform-hud" className="viewport-transform-bar">
        {/* Transform Mode Switchers */}
        <div className="hud-button-group">
          <button
            id="hud-btn-mode-translate"
            className={`hud-tool-btn ${transformMode === 'translate' ? 'active' : ''}`}
            onClick={() => setTransformMode('translate')}
            title="Move / Translate Object (W)"
          >
            <Move size={14} />
            <span>Move</span>
          </button>
          <button
            id="hud-btn-mode-rotate"
            className={`hud-tool-btn ${transformMode === 'rotate' ? 'active' : ''}`}
            onClick={() => setTransformMode('rotate')}
            title="Rotate Object (E)"
          >
            <RotateCw size={14} />
            <span>Rotate</span>
          </button>
          <button
            id="hud-btn-mode-scale"
            className={`hud-tool-btn ${transformMode === 'scale' ? 'active' : ''}`}
            onClick={() => setTransformMode('scale')}
            title="Resize / Scale Object (R)"
          >
            <Maximize2 size={14} />
            <span>Resize</span>
          </button>
        </div>

        {/* Snap Toggle */}
        <button
          id="hud-btn-toggle-snap"
          className={`hud-tool-btn snap-btn ${snapSettings.enabled ? 'active' : ''}`}
          onClick={toggleSnap}
          title="Toggle Grid Snapping (X)"
        >
          <span>SNAP: {snapSettings.enabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Selection Actions (when object is selected) */}
        {selectedObject && (
          <div className="hud-button-group selection-actions">
            <button
              id="hud-btn-focus"
              className="hud-tool-btn"
              onClick={focusSelectedObject}
              title="Frame camera on selected object (F)"
            >
              <Target size={13} />
              <span>Frame</span>
            </button>
            <button
              id="hud-btn-duplicate"
              className="hud-tool-btn"
              onClick={() => duplicateObject(selectedObject.id)}
              title="Duplicate Selected Object (Ctrl+D)"
            >
              <Copy size={13} />
              <span>Clone</span>
            </button>
            {!selectedObject.locked && (
              <button
                id="hud-btn-delete"
                className="hud-tool-btn hover-danger"
                onClick={() => deleteObject(selectedObject.id)}
                title="Delete Selected Object (Del)"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            )}
            <button
              id="hud-btn-deselect"
              className="hud-tool-btn"
              onClick={deselectObject}
              title="Deselect (Esc)"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      <Canvas
        shadows
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
        camera={{ position: [6.8, 4.8, 7.8], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        onCreated={({ gl }) => {
          const canvasElement = gl.domElement;
          const handleLoss = (e: Event) => {
            e.preventDefault();
            console.warn('WebGL Context Lost in 3D Viewport');
            if (onContextLost) onContextLost();
          };
          canvasElement.addEventListener('webglcontextlost', handleLoss, false);
        }}
      >
        <CameraController
          preset={viewportSettings.cameraPreset}
          focusTrigger={focusTrigger}
          selectedObject={selectedObject}
        />
        <EnvironmentLighting preset={viewportSettings.lightingPreset} />
        <Scene />
        <TransformGizmo />

        {/* CAD Coordinate Orientation Gizmo in bottom-left */}
        <GizmoHelper alignment="bottom-left" margin={[65, 65]}>
          <GizmoViewport
            axisColors={['#ef4444', '#10b981', '#38bdf8']}
            labelColor="#f1f5f9"
          />
        </GizmoHelper>
      </Canvas>
    </div>
  );
};
