import React from 'react';
import type { LightingPreset } from '../../types/editor';

interface Props {
  preset: LightingPreset;
}

export const EnvironmentLighting: React.FC<Props> = ({ preset }) => {
  if (preset === 'night') {
    return (
      <>
        {/* Soft moonlight & night blue ambiance */}
        <ambientLight intensity={0.18} color="#0c1f38" />
        <directionalLight
          position={[4, 8, 4]}
          intensity={0.35}
          color="#38bdf8"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
        />
        <pointLight position={[2.2, 3, -1.7]} intensity={0.3} color="#00ffff" distance={8} />
      </>
    );
  }

  if (preset === 'actinic') {
    return (
      <>
        {/* Deep blue marine / actinic reef spectrum */}
        <ambientLight intensity={0.4} color="#081e36" />
        <directionalLight
          position={[2, 10, 3]}
          intensity={1.2}
          color="#38bdf8"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
        />
        <pointLight position={[2.2, 4, -1.7]} intensity={0.8} color="#818cf8" distance={10} />
        <directionalLight position={[-4, 3, -4]} intensity={0.3} color="#1e40af" />
      </>
    );
  }

  if (preset === 'studio') {
    return (
      <>
        {/* Studio CAD Lighting: Clean, neutral, high-contrast, soft shadows */}
        <ambientLight intensity={0.7} color="#f8fafc" />
        {/* Main Overhead Key Light */}
        <directionalLight
          position={[5, 12, 6]}
          intensity={1.2}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
          shadow-camera-near={0.5}
          shadow-camera-far={25}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        {/* Secondary Fill Light illuminating interior chambers */}
        <directionalLight
          position={[-6, 5, -3]}
          intensity={0.45}
          color="#cbd5e1"
        />
        {/* Top-down soft light directly over the filter container */}
        <directionalLight
          position={[2.2, 8, -1.75]}
          intensity={0.6}
          color="#f1f5f9"
        />
      </>
    );
  }

  // Daylight (default)
  return (
    <>
      {/* Crisp overhead aquarium LED fixture with soft shadows */}
      <ambientLight intensity={0.65} color="#e2e8f0" />
      <directionalLight
        position={[4, 12, 5]}
        intensity={1.3}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      {/* Cool Aquatic Fill Bounce */}
      <directionalLight
        position={[-5, 4, -4]}
        intensity={0.4}
        color="#bae6fd"
      />
      {/* Interior Container Focused Fill */}
      <pointLight position={[2.2, 4.5, -1.75]} intensity={0.5} color="#e0f2fe" distance={10} />
    </>
  );
};
