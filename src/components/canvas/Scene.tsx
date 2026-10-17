import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneSettings } from '../../types/scene';

interface SceneProps {
  settings: SceneSettings;
}

export const Scene: React.FC<SceneProps> = ({ settings }) => {
  const bubblesRef = useRef<THREE.Points>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const outflowWaterRef = useRef<THREE.Mesh>(null);

  // Generate gentle floating microbubble particles
  const particleCount = 120;
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const spd = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6.0;      // X within tank
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3.0;  // Y within water
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2.8;  // Z within tank
      spd[i] = 0.2 + Math.random() * 0.4;
    }
    return [pos, spd];
  }, [particleCount]);

  // Frame tick animation for bubbles & subtle water surface motion
  useFrame((_, delta) => {
    if (bubblesRef.current) {
      const posArray = bubblesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3 + 1] += speeds[i] * delta;
        // Reset bubble to bottom once it hits water surface
        if (posArray[i * 3 + 1] > 1.6) {
          posArray[i * 3 + 1] = -1.6;
          posArray[i * 3] = (Math.random() - 0.5) * 6.0;
        }
      }
      bubblesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (waterRef.current) {
      waterRef.current.position.y = 0.05 + Math.sin(Date.now() * 0.0015) * 0.02;
    }

    if (outflowWaterRef.current) {
      outflowWaterRef.current.scale.y = 1 + Math.sin(Date.now() * 0.008) * 0.08;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Visual Debug Helpers */}
      {settings.showHelpers && (
        <>
          <gridHelper args={[16, 16, '#00f5d4', '#2b2d42']} position={[0, -2.1, 0]} />
          <axesHelper args={[4]} />
        </>
      )}

      {/* ============================================================== */}
      {/* 1. TANK GLASS & FRAME (7.0w x 3.8h x 3.5d)                      */}
      {/* ============================================================== */}
      {/* Glass Walls */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[7.0, 3.8, 3.5]} />
        <meshPhysicalMaterial
          color="#a0e9fd"
          transparent
          opacity={0.18}
          roughness={0.05}
          transmission={0.88}
          ior={1.5}
          thickness={0.2}
          wireframe={settings.wireframe}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Tank Rim / Edge Accents (Matte Obsidian) */}
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[7.15, 0.12, 3.65]} />
        <meshStandardMaterial color="#1a202c" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, -1.9, 0]}>
        <boxGeometry args={[7.15, 0.15, 3.65]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* ============================================================== */}
      {/* 2. SUBSTRATE (Natural River Gravel Bed)                        */}
      {/* ============================================================== */}
      <mesh position={[0, -1.75, 0]}>
        <boxGeometry args={[6.85, 0.25, 3.35]} />
        <meshStandardMaterial
          color="#374151"
          roughness={0.85}
          metalness={0.1}
          wireframe={settings.wireframe}
        />
      </mesh>

      {/* ============================================================== */}
      {/* 3. WATER VOLUME (Translucent Aquatic Body)                      */}
      {/* ============================================================== */}
      <mesh ref={waterRef} position={[0, 0, 0]}>
        <boxGeometry args={[6.88, 3.3, 3.38]} />
        <meshPhysicalMaterial
          color="#00b4d8"
          transparent
          opacity={settings.waterOpacity}
          roughness={0.08}
          transmission={0.8}
          ior={1.33}
          wireframe={settings.wireframe}
        />
      </mesh>

      {/* Floating Aeration Microbubbles */}
      <points ref={bubblesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#caf0f8"
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* ============================================================== */}
      {/* 4. FILTER PROTOTYPE GEOMETRY (Hang-On-Back Architecture)       */}
      {/* ============================================================== */}
      <group position={[2.2, 1.4, -1.75]}>
        {/* Main Filter Housing Box */}
        <mesh position={[0, 0.4, -0.45]}>
          <boxGeometry args={[1.8, 1.6, 0.9]} />
          <meshPhysicalMaterial
            color="#334155"
            transparent
            opacity={0.85}
            roughness={0.2}
            metalness={0.4}
            wireframe={settings.wireframe}
          />
        </mesh>

        {/* Filter Chamber Lid */}
        <mesh position={[0, 1.25, -0.45]}>
          <boxGeometry args={[1.85, 0.1, 0.95]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>

        {/* Filter Media Stage 1: Mechanical Sponge (Coarse Foam) */}
        <mesh position={[-0.45, 0.35, -0.45]}>
          <boxGeometry args={[0.35, 1.1, 0.7]} />
          <meshStandardMaterial
            color="#2563eb"
            roughness={0.9}
            wireframe={settings.wireframe}
          />
        </mesh>

        {/* Filter Media Stage 2: Biological Ceramic Rings */}
        <mesh position={[0.0, 0.35, -0.45]}>
          <boxGeometry args={[0.38, 1.1, 0.7]} />
          <meshStandardMaterial
            color="#cbd5e1"
            roughness={0.7}
            wireframe={settings.wireframe}
          />
        </mesh>

        {/* Filter Media Stage 3: Chemical Activated Carbon */}
        <mesh position={[0.45, 0.35, -0.45]}>
          <boxGeometry args={[0.35, 1.1, 0.7]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.95}
            wireframe={settings.wireframe}
          />
        </mesh>

        {/* Filter Intake Pipe (Extends down into tank water) */}
        <mesh position={[-0.55, -1.2, 0.3]}>
          <cylinderGeometry args={[0.08, 0.08, 2.6, 16]} />
          <meshPhysicalMaterial
            color="#64748b"
            transparent
            opacity={0.65}
            roughness={0.1}
            transmission={0.8}
            wireframe={settings.wireframe}
          />
        </mesh>

        {/* Intake Strainer Basket (Slotted end at bottom) */}
        <mesh position={[-0.55, -2.55, 0.3]}>
          <cylinderGeometry args={[0.12, 0.09, 0.35, 12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} wireframe={settings.wireframe} />
        </mesh>

        {/* Filter Outflow Spillway / Lip */}
        <mesh position={[0.1, 0.3, 0.05]}>
          <boxGeometry args={[0.8, 0.08, 0.3]} />
          <meshStandardMaterial color="#475569" roughness={0.2} metalness={0.5} />
        </mesh>

        {/* Waterfall Stream Return to Tank */}
        <mesh ref={outflowWaterRef} position={[0.1, -0.05, 0.15]}>
          <planeGeometry args={[0.75, 0.65]} />
          <meshPhysicalMaterial
            color="#7dd3fc"
            transparent
            opacity={0.55}
            roughness={0.05}
            transmission={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Decorative River Stones (Aquatic Aquascape Prototype) */}
      <mesh position={[-2.2, -1.55, -0.4]} rotation={[0.2, 0.4, 0.1]}>
        <dodecahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>
      <mesh position={[-1.4, -1.6, 0.3]} rotation={[0.4, -0.5, 0.3]}>
        <dodecahedronGeometry args={[0.38, 1]} />
        <meshStandardMaterial color="#64748b" roughness={0.85} />
      </mesh>
    </group>
  );
};
