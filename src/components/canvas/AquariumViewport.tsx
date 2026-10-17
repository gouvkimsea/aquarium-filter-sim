import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Scene } from './Scene';
import { EnvironmentLighting } from './EnvironmentLighting';
import { useEditor } from '../../context/EditorContext';
import type { CameraPreset } from '../../types/editor';

interface ViewportProps {
  onContextLost?: () => void;
}

const CameraController: React.FC<{ preset: CameraPreset }> = ({ preset }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    switch (preset) {
      case 'top':
        // Looking directly down into the filter container and tank interior
        controls.object.position.set(2.2, 9.5, -1.75);
        controls.target.set(2.2, 1.4, -1.75);
        break;
      case 'front':
        // Front elevation view
        controls.object.position.set(0, 0.8, 9.8);
        controls.target.set(0, 0.2, 0);
        break;
      case 'side':
        // Right side view looking through the tank and filter cross-section
        controls.object.position.set(9.8, 0.8, 0);
        controls.target.set(0, 0.2, 0);
        break;
      case 'left':
        // Left side view
        controls.object.position.set(-9.8, 0.8, 0);
        controls.target.set(0, 0.2, 0);
        break;
      case 'back':
        // Rear view inspecting filter mount and pipework
        controls.object.position.set(2.2, 1.8, -9.5);
        controls.target.set(2.2, 1.4, -1.75);
        break;
      case 'filter-closeup':
        // Targeted closeup focused right on the transparent filter container interior
        controls.object.position.set(3.4, 2.4, -0.4);
        controls.target.set(2.2, 1.4, -1.75);
        break;
      case 'isometric':
      default:
        // Default 3D Perspective angle
        controls.object.position.set(6.8, 4.8, 7.8);
        controls.target.set(0, 0, 0);
        break;
    }
    controls.update();
  }, [preset]);

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
      minPolarAngle={0} // Allows inspecting from directly above
      maxPolarAngle={Math.PI / 2 + 0.12} // Allows 360 degree inspection from all sides and slightly below rim
    />
  );
};

export const AquariumViewport: React.FC<ViewportProps> = ({ onContextLost }) => {
  const { viewportSettings, updateViewportSettings } = useEditor();

  const setCameraPreset = (preset: CameraPreset) => {
    updateViewportSettings((prev) => ({ ...prev, cameraPreset: preset }));
  };

  return (
    <div id="aquarium-3d-viewport" className="viewport-container">
      {/* Floating In-Viewport Quick Camera Navigation Bar */}
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
        <CameraController preset={viewportSettings.cameraPreset} />
        <EnvironmentLighting preset={viewportSettings.lightingPreset} />
        <Scene />

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
