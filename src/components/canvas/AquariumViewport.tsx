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
        controls.object.position.set(0, 11, 0.01);
        controls.target.set(0, 0, 0);
        break;
      case 'front':
        controls.object.position.set(0, 0, 9.5);
        controls.target.set(0, 0, 0);
        break;
      case 'side':
        controls.object.position.set(9.5, 0, 0);
        controls.target.set(0, 0, 0);
        break;
      case 'filter-closeup':
        controls.object.position.set(3.8, 2.8, -0.6);
        controls.target.set(2.2, 1.2, -1.5);
        break;
      case 'isometric':
      default:
        controls.object.position.set(6.8, 4.8, 7.8);
        controls.target.set(0, 0, 0);
        break;
    }
    controls.update();
  }, [preset]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={2.5}
      maxDistance={25}
      maxPolarAngle={Math.PI / 2 + 0.05}
    />
  );
};

export const AquariumViewport: React.FC<ViewportProps> = ({ onContextLost }) => {
  const { viewportSettings } = useEditor();

  return (
    <div id="aquarium-3d-viewport" className="viewport-container">
      <Canvas
        camera={{ position: [6.8, 4.8, 7.8], fov: 45 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
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
        <GizmoHelper alignment="bottom-left" margin={[60, 60]}>
          <GizmoViewport
            axisColors={['#f43f5e', '#10b981', '#38bdf8']}
            labelColor="#f1f5f9"
          />
        </GizmoHelper>
      </Canvas>
    </div>
  );
};
