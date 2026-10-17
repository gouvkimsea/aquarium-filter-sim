import React from 'react';
import type { SceneSettings } from '../../types/scene';

interface Props {
  preset: SceneSettings['lightingPreset'];
}

export const EnvironmentLighting: React.FC<Props> = ({ preset }) => {
  if (preset === 'night') {
    return (
      <>
        {/* Soft moonlight & night blue ambiance */}
        <ambientLight intensity={0.15} color="#0d2b45" />
        <directionalLight
          position={[5, 10, 5]}
          intensity={0.3}
          color="#3a86ff"
          castShadow
        />
        <pointLight position={[0, 4, 0]} intensity={0.4} color="#00ffff" distance={10} />
      </>
    );
  }

  if (preset === 'actinic') {
    return (
      <>
        {/* Deep blue marine / actinic reef spectrum */}
        <ambientLight intensity={0.4} color="#0a2540" />
        <directionalLight
          position={[0, 12, 2]}
          intensity={1.2}
          color="#4cc9f0"
          castShadow
        />
        <pointLight position={[2, 6, 2]} intensity={0.8} color="#7209b7" distance={15} />
      </>
    );
  }

  // Daylight (default)
  return (
    <>
      {/* Crisp overhead aquarium LED fixture */}
      <ambientLight intensity={0.65} color="#e6f4f1" />
      <directionalLight
        position={[4, 12, 6]}
        intensity={1.4}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-6, 4, -4]}
        intensity={0.4}
        color="#b0e0e6"
      />
      <pointLight position={[0, 5, 0]} intensity={0.7} color="#48cae4" distance={12} />
    </>
  );
};
