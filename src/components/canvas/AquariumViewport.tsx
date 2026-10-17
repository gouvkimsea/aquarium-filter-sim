import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Scene } from './Scene';
import { EnvironmentLighting } from './EnvironmentLighting';
import type { SceneSettings } from '../../types/scene';

interface ViewportProps {
  settings: SceneSettings;
  onContextLost?: () => void;
}

// Camera transition controller according to presets
const CameraController: React.FC<{ preset: SceneSettings['cameraPreset'] }> = ({ preset }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    switch (preset) {
      case 'top':
        controls.object.position.set(0, 10, 0.01);
        controls.target.set(0, 0, 0);
        break;
      case 'front':
        controls.object.position.set(0, 0, 8.5);
        controls.target.set(0, 0, 0);
        break;
      case 'side':
        controls.object.position.set(9, 0, 0);
        controls.target.set(0, 0, 0);
        break;
      case 'filter-closeup':
        controls.object.position.set(3.8, 2.8, -0.6);
        controls.target.set(2.2, 1.2, -1.5);
        break;
      case 'default':
      default:
        controls.object.position.set(6.5, 4.5, 7.5);
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
      minDistance={3.5}
      maxDistance={20}
      maxPolarAngle={Math.PI / 2 + 0.05} // Prevent rotating below ground
    />
  );
};

export const AquariumViewport: React.FC<ViewportProps> = ({ settings, onContextLost }) => {
  return (
    <div id="aquarium-3d-viewport" className="viewport-container">
      <Canvas
        camera={{ position: [6.5, 4.5, 7.5], fov: 45 }}
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
        <CameraController preset={settings.cameraPreset} />
        <EnvironmentLighting preset={settings.lightingPreset} />
        <Scene settings={settings} />
      </Canvas>
    </div>
  );
};
