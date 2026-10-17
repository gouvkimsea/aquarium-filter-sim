import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { EditorObject } from '../../../types/editor';

interface ComponentMeshProps {
  object: EditorObject;
  isWireframeAll?: boolean;
  interactiveProps?: Record<string, any>;
}

// ----------------------------------------------------------------------
// 1. Filter Container: Open-top transparent acrylic basin with rim lips
// ----------------------------------------------------------------------
export const FilterContainerMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;
  const wallThick = 0.04;
  const bottomThick = 0.05;

  return (
    <group {...interactiveProps}>
      {/* Bottom Plate */}
      <mesh position={[0, -dimensions.y / 2 + bottomThick / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[dimensions.x, bottomThick, dimensions.z]} />
        <meshStandardMaterial
          color={material.color}
          roughness={material.roughness}
          metalness={material.metalness}
          transparent={material.transparent}
          opacity={Math.min(1.0, material.opacity + 0.3)}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Front Wall */}
      <mesh
        position={[0, bottomThick / 2, dimensions.z / 2 - wallThick / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[dimensions.x, dimensions.y - bottomThick, wallThick]} />
        <meshStandardMaterial
          color={material.color}
          roughness={material.roughness}
          metalness={material.metalness}
          transparent={material.transparent}
          opacity={material.opacity}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Back Wall */}
      <mesh
        position={[0, bottomThick / 2, -dimensions.z / 2 + wallThick / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[dimensions.x, dimensions.y - bottomThick, wallThick]} />
        <meshStandardMaterial
          color={material.color}
          roughness={material.roughness}
          metalness={material.metalness}
          transparent={material.transparent}
          opacity={material.opacity}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Left Wall */}
      <mesh
        position={[-dimensions.x / 2 + wallThick / 2, bottomThick / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThick, dimensions.y - bottomThick, dimensions.z - wallThick * 2]} />
        <meshStandardMaterial
          color={material.color}
          roughness={material.roughness}
          metalness={material.metalness}
          transparent={material.transparent}
          opacity={material.opacity}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Right Wall */}
      <mesh
        position={[dimensions.x / 2 - wallThick / 2, bottomThick / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThick, dimensions.y - bottomThick, dimensions.z - wallThick * 2]} />
        <meshStandardMaterial
          color={material.color}
          roughness={material.roughness}
          metalness={material.metalness}
          transparent={material.transparent}
          opacity={material.opacity}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Top Rim Trim Flange */}
      <mesh position={[0, dimensions.y / 2, 0]}>
        <boxGeometry args={[dimensions.x + 0.05, 0.03, dimensions.z + 0.05]} />
        <meshStandardMaterial
          color="#334155"
          roughness={0.25}
          metalness={0.4}
          transparent={material.transparent}
          opacity={0.8}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>
    </group>
  );
};

// ----------------------------------------------------------------------
// 2. Internal Divider: Acrylic baffle plate with underflow gap & weir teeth
// ----------------------------------------------------------------------
export const InternalDividerMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;
  const plateThick = Math.max(0.02, dimensions.x);
  const underflowSlotH = dimensions.y * 0.14;
  const mainPlateH = dimensions.y - underflowSlotH;

  return (
    <group {...interactiveProps}>
      {/* Main Divider Plate (raised to leave bottom underflow pass) */}
      <mesh position={[0, underflowSlotH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[plateThick, mainPlateH, dimensions.z]} />
        <meshStandardMaterial
          color={material.color}
          roughness={material.roughness}
          metalness={material.metalness}
          transparent={material.transparent}
          opacity={material.opacity}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Top Weir Notch Rail */}
      <mesh position={[0, dimensions.y / 2 + 0.02, 0]}>
        <boxGeometry args={[plateThick * 1.5, 0.04, dimensions.z]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.2}
          metalness={0.3}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Flow Indicator Notch Visuals */}
      {[-0.25, 0, 0.25].map((zOffset, i) => (
        <mesh key={i} position={[0, dimensions.y / 2 - 0.04, zOffset]}>
          <boxGeometry args={[plateThick * 1.8, 0.06, 0.08]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      ))}
    </group>
  );
};

// ----------------------------------------------------------------------
// 3. Coarse Sponge: Textured blue foam pad with grooved flute slots
// ----------------------------------------------------------------------
export const CoarseSpongeMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;
  const grooves = 4;

  return (
    <group {...interactiveProps}>
      {/* Main Foam Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dimensions.x, dimensions.y, dimensions.z]} />
        <meshStandardMaterial
          color={material.color || '#1d4ed8'}
          roughness={0.95}
          metalness={0.05}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Grooved Reticulated Foam Ridges on top */}
      {Array.from({ length: grooves }).map((_, i) => {
        const offsetZ = ((i - (grooves - 1) / 2) * dimensions.z) / (grooves + 0.5);
        return (
          <mesh key={i} position={[0, dimensions.y / 2 + 0.02, offsetZ]}>
            <boxGeometry args={[dimensions.x * 0.96, 0.035, dimensions.z / (grooves * 2.2)]} />
            <meshStandardMaterial
              color="#1e40af"
              roughness={0.98}
              metalness={0.02}
              wireframe={isWireframeAll || material.wireframe}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// ----------------------------------------------------------------------
// 4. Fine Sponge: High-density dark teal/black micro-pore block
// ----------------------------------------------------------------------
export const FineSpongeMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;

  return (
    <group {...interactiveProps}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dimensions.x, dimensions.y, dimensions.z]} />
        <meshStandardMaterial
          color={material.color || '#0f766e'}
          roughness={0.88}
          metalness={0.08}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Micro-chamfered rim accent */}
      <mesh position={[0, dimensions.y / 2 + 0.01, 0]}>
        <boxGeometry args={[dimensions.x * 0.94, 0.018, dimensions.z * 0.94]} />
        <meshStandardMaterial
          color="#115e59"
          roughness={0.92}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>
    </group>
  );
};

// ----------------------------------------------------------------------
// 5. Filter Floss Pad: Soft, pure white polishing cotton pad
// ----------------------------------------------------------------------
export const FilterFlossPadMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;

  return (
    <group {...interactiveProps}>
      {/* Base Layer Pad */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dimensions.x, dimensions.y, dimensions.z]} />
        <meshStandardMaterial
          color={material.color || '#f8fafc'}
          roughness={0.9}
          metalness={0.02}
          transparent={true}
          opacity={0.94}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Soft Quilted Top Layer Cushion */}
      <mesh position={[0, dimensions.y * 0.25, 0]}>
        <boxGeometry args={[dimensions.x * 0.92, dimensions.y * 0.5, dimensions.z * 0.92]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.85}
          metalness={0.01}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>
    </group>
  );
};

// ----------------------------------------------------------------------
// 6. Ceramic Bio Rings: Porous hollow sintered ceramic cylinders
// ----------------------------------------------------------------------
export const CeramicBioRingsMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;

  // Grid coordinates of rings within the bounding volume
  const ringOffsets = useMemo(() => {
    return [
      [-0.18, -0.15, -0.18],
      [0.18, -0.15, -0.18],
      [-0.18, -0.15, 0.18],
      [0.18, -0.15, 0.18],
      [0, 0, 0],
      [-0.15, 0.2, -0.1],
      [0.15, 0.2, 0.1],
      [0, 0.25, -0.15],
    ];
  }, []);

  const ringR = Math.min(0.12, dimensions.x * 0.22);
  const ringH = Math.min(0.2, dimensions.y * 0.3);

  return (
    <group {...interactiveProps}>
      {/* Media Tray Bed Basket */}
      <mesh position={[0, -dimensions.y / 2 + 0.02, 0]}>
        <boxGeometry args={[dimensions.x, 0.04, dimensions.z]} />
        <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Sintered Ceramic Rings Cluster */}
      {ringOffsets.map((pos, idx) => (
        <group
          key={idx}
          position={[
            pos[0] * (dimensions.x / 0.6),
            pos[1] * (dimensions.y / 0.8),
            pos[2] * (dimensions.z / 0.6),
          ]}
          rotation={[
            (idx % 2 === 0 ? 0 : Math.PI / 2),
            (idx * 45 * Math.PI) / 180,
            0,
          ]}
        >
          {/* Outer Cylinder Wall */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[ringR, ringR, ringH, 14, 1, false]} />
            <meshStandardMaterial
              color={material.color || '#e2e8f0'}
              roughness={0.85}
              metalness={0.05}
              wireframe={isWireframeAll || material.wireframe}
            />
          </mesh>

          {/* Inner Hollow Hole Cap */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[ringR * 0.55, ringR * 0.55, ringH + 0.005, 14, 1, false]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ----------------------------------------------------------------------
// 7. Biological Media Balls: Spherical geometric ribbed bio-balls
// ----------------------------------------------------------------------
export const BioBallsMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;
  const radius = Math.min(dimensions.x, dimensions.y, dimensions.z) * 0.42;

  return (
    <group {...interactiveProps}>
      {/* Media Tray Base */}
      <mesh position={[0, -dimensions.y / 2 + 0.02, 0]}>
        <boxGeometry args={[dimensions.x, 0.04, dimensions.z]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Bio-Ball Cluster */}
      {[
        [-radius * 0.6, 0, -radius * 0.6],
        [radius * 0.6, 0, -radius * 0.6],
        [-radius * 0.6, 0, radius * 0.6],
        [radius * 0.6, 0, radius * 0.6],
        [0, radius * 0.75, 0],
      ].map((pos, idx) => (
        <group key={idx} position={pos as [number, number, number]}>
          {/* Inner Core Sphere */}
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[radius * 0.45, 12, 12]} />
            <meshStandardMaterial
              color={material.color || '#18181b'}
              roughness={0.65}
              metalness={0.15}
              wireframe={isWireframeAll || material.wireframe}
            />
          </mesh>

          {/* Horizontal Rib Disk */}
          <mesh>
            <cylinderGeometry args={[radius * 0.75, radius * 0.75, 0.02, 16]} />
            <meshStandardMaterial
              color="#09090b"
              roughness={0.6}
              metalness={0.2}
              wireframe={isWireframeAll || material.wireframe}
            />
          </mesh>

          {/* Vertical Rib Disk 1 */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[radius * 0.75, radius * 0.75, 0.02, 16]} />
            <meshStandardMaterial
              color="#09090b"
              roughness={0.6}
              metalness={0.2}
              wireframe={isWireframeAll || material.wireframe}
            />
          </mesh>

          {/* Vertical Rib Disk 2 */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[radius * 0.75, radius * 0.75, 0.02, 16]} />
            <meshStandardMaterial
              color="#09090b"
              roughness={0.6}
              metalness={0.2}
              wireframe={isWireframeAll || material.wireframe}
            />
          </mesh>

          {/* Outer Faceted Cage */}
          <mesh>
            <icosahedronGeometry args={[radius * 0.8, 0]} />
            <meshStandardMaterial
              color="#27272a"
              wireframe={true}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ----------------------------------------------------------------------
// 8. Submersible Pump: Powerhead motor with volute, intake & outlet nozzle
// ----------------------------------------------------------------------
export const SubmersiblePumpMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;
  const bodyW = dimensions.x * 0.65;
  const bodyH = dimensions.y * 0.65;
  const bodyD = dimensions.z * 0.7;

  return (
    <group {...interactiveProps}>
      {/* Main Motor Housing Block */}
      <mesh position={[0, -0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyW, bodyH, bodyD]} />
        <meshStandardMaterial
          color={material.color || '#0f172a'}
          roughness={0.35}
          metalness={0.45}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Front Impeller Volute Chamber */}
      <mesh position={[0, -0.05, bodyD / 2 + 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[bodyH * 0.38, bodyH * 0.38, 0.24, 20]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.25}
          metalness={0.3}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Impeller Face Accent Ring */}
      <mesh position={[0, -0.05, bodyD / 2 + 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[bodyH * 0.22, bodyH * 0.22, 0.03, 16]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.6} />
      </mesh>

      {/* Vertical Discharge Outlet Nozzle */}
      <mesh position={[0, bodyH / 2 + 0.14, bodyD / 4]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.28, 20]} />
        <meshStandardMaterial
          color="#334155"
          roughness={0.2}
          metalness={0.5}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Bottom Suction Mounting Feet */}
      {[-0.18, 0.18].map((xOffset, i) => (
        <mesh key={i} position={[xOffset, -bodyH / 2 - 0.1, 0]}>
          <cylinderGeometry args={[0.07, 0.1, 0.06, 12]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
      ))}

      {/* Flow Rate Control Dial */}
      <mesh position={[bodyW / 2 + 0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 14]} />
        <meshStandardMaterial color="#00f5d4" roughness={0.2} metalness={0.6} />
      </mesh>
    </group>
  );
};

// ----------------------------------------------------------------------
// 9. Straight Pipe: Rigid cylindrical tube with connector collar rings
// ----------------------------------------------------------------------
export const StraightPipeMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;
  const radius = Math.max(0.06, dimensions.x / 2);
  const height = dimensions.y;
  const collarR = radius * 1.25;

  return (
    <group {...interactiveProps}>
      {/* Main Cylinder Tube */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, 24]} />
        <meshStandardMaterial
          color={material.color || '#475569'}
          roughness={material.roughness || 0.15}
          metalness={material.metalness || 0.3}
          transparent={material.transparent}
          opacity={material.opacity}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Top Fitting Collar */}
      <mesh position={[0, height / 2 - 0.08, 0]}>
        <cylinderGeometry args={[collarR, collarR, 0.15, 24]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.3}
          metalness={0.4}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Bottom Fitting Collar */}
      <mesh position={[0, -height / 2 + 0.08, 0]}>
        <cylinderGeometry args={[collarR, collarR, 0.15, 24]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.3}
          metalness={0.4}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>
    </group>
  );
};

// ----------------------------------------------------------------------
// 10. Elbow Pipe: 90-degree curved sweep elbow with connector collars
// ----------------------------------------------------------------------
export const ElbowPipeMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;
  const radius = Math.max(0.06, Math.min(dimensions.x, dimensions.y) * 0.22);
  const armLen = Math.max(0.2, dimensions.x * 0.45);

  return (
    <group {...interactiveProps}>
      {/* Horizontal Leg */}
      <mesh position={[armLen / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, armLen, 20]} />
        <meshStandardMaterial
          color={material.color || '#334155'}
          roughness={material.roughness || 0.2}
          metalness={material.metalness || 0.35}
          transparent={material.transparent}
          opacity={material.opacity}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Vertical Leg */}
      <mesh position={[0, -armLen / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, armLen, 20]} />
        <meshStandardMaterial
          color={material.color || '#334155'}
          roughness={material.roughness || 0.2}
          metalness={material.metalness || 0.35}
          transparent={material.transparent}
          opacity={material.opacity}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* 90-Degree Corner Elbow Sphere Junction */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[radius * 1.05, 16, 16]} />
        <meshStandardMaterial
          color={material.color || '#334155'}
          roughness={0.2}
          metalness={0.35}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Horizontal End Collar Ring */}
      <mesh position={[armLen, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 1.25, radius * 1.25, 0.08, 20]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Vertical End Collar Ring */}
      <mesh position={[0, -armLen, 0]}>
        <cylinderGeometry args={[radius * 1.25, radius * 1.25, 0.08, 20]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );
};

// ----------------------------------------------------------------------
// 11. Flexible Hose: Corrugated ribbed flexible tubing
// ----------------------------------------------------------------------
export const FlexibleHoseMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;
  const radius = Math.max(0.06, dimensions.x / 2);
  const height = dimensions.y;
  const ringCount = 10;

  return (
    <group {...interactiveProps}>
      {/* Main Core Cylinder */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, 20]} />
        <meshStandardMaterial
          color={material.color || '#059669'}
          roughness={material.roughness || 0.3}
          metalness={material.metalness || 0.15}
          transparent={material.transparent}
          opacity={material.opacity}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Corrugated Spiral Rib Rings along height */}
      {Array.from({ length: ringCount }).map((_, i) => {
        const yPos = (i - (ringCount - 1) / 2) * (height / (ringCount + 1));
        return (
          <mesh key={i} position={[0, yPos, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.016, 8, 20]} />
            <meshStandardMaterial
              color="#047857"
              roughness={0.4}
              metalness={0.2}
              wireframe={isWireframeAll || material.wireframe}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// ----------------------------------------------------------------------
// 12. Water Inlet: Suction intake pipe with slotted strainer basket
// ----------------------------------------------------------------------
export const WaterInletMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;
  const radius = Math.max(0.06, dimensions.x / 2);
  const tubeH = dimensions.y * 0.72;
  const strainerH = dimensions.y * 0.28;

  return (
    <group {...interactiveProps}>
      {/* Upper Intake Tube */}
      <mesh position={[0, strainerH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, tubeH, 20]} />
        <meshStandardMaterial
          color={material.color || '#64748b'}
          roughness={material.roughness || 0.15}
          metalness={material.metalness || 0.25}
          transparent={material.transparent}
          opacity={material.opacity}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Lower Tapered Strainer Cone Basket */}
      <mesh position={[0, -tubeH / 2, 0]} castShadow>
        <cylinderGeometry args={[radius * 1.15, radius * 0.55, strainerH, 16]} />
        <meshStandardMaterial
          color="#334155"
          roughness={0.3}
          metalness={0.4}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Strainer Slotted Guard Rings */}
      {[-0.1, 0, 0.1].map((offset, i) => (
        <mesh key={i} position={[0, -tubeH / 2 + offset * strainerH, 0]}>
          <cylinderGeometry args={[radius * 1.2, radius * 1.2, 0.02, 16]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      ))}

      {/* Inflow Direction Arrow Indicator */}
      <mesh position={[0, -tubeH / 2 + 0.05, 0]}>
        <coneGeometry args={[0.07, 0.15, 8]} />
        <meshBasicMaterial color="#00f5d4" />
      </mesh>
    </group>
  );
};

// ----------------------------------------------------------------------
// 13. Water Outlet: Lily Pipe / Duckbill surface return nozzle
// ----------------------------------------------------------------------
export const WaterOutletMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;
  const radius = Math.max(0.06, dimensions.z / 2);
  const flareW = dimensions.x * 0.75;
  const stemH = dimensions.y * 0.6;

  return (
    <group {...interactiveProps}>
      {/* Vertical Supply Tube */}
      <mesh position={[0, -dimensions.y / 2 + stemH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, stemH, 20]} />
        <meshStandardMaterial
          color={material.color || '#a0e9fd'}
          roughness={material.roughness || 0.1}
          metalness={material.metalness || 0.2}
          transparent={material.transparent}
          opacity={material.opacity}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* 90-Degree Curve into Outflow Flare */}
      <mesh position={[flareW * 0.25, stemH * 0.35, 0]} rotation={[0, 0, -Math.PI / 3]}>
        <cylinderGeometry args={[radius * 1.8, radius, flareW * 0.6, 20]} />
        <meshStandardMaterial
          color={material.color || '#a0e9fd'}
          roughness={0.08}
          metalness={0.15}
          transparent={true}
          opacity={0.55}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Trumpet Lily Flared Bell Mouth */}
      <mesh position={[flareW * 0.5, stemH * 0.5, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[radius * 2.4, radius * 1.5, 0.18, 24, 1, true]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.05}
          metalness={0.3}
          transparent={true}
          opacity={0.65}
          side={THREE.DoubleSide}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Outflow Ripple Ring */}
      <mesh position={[flareW * 0.58, stemH * 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[radius * 2.2, 0.015, 8, 24]} />
        <meshBasicMaterial color="#00f5d4" />
      </mesh>
    </group>
  );
};

// ----------------------------------------------------------------------
// Unified Dispatcher Component: Selects the appropriate 3D model
// ----------------------------------------------------------------------
export const ReusableFilterMesh: React.FC<ComponentMeshProps> = (props) => {
  const { object } = props;
  const type = object.componentType || (object.parameters.componentType as string);

  switch (type) {
    case 'filter-container':
      return <FilterContainerMesh {...props} />;
    case 'internal-divider':
      return <InternalDividerMesh {...props} />;
    case 'coarse-sponge':
      return <CoarseSpongeMesh {...props} />;
    case 'fine-sponge':
      return <FineSpongeMesh {...props} />;
    case 'filter-floss-pad':
      return <FilterFlossPadMesh {...props} />;
    case 'ceramic-bio-rings':
      return <CeramicBioRingsMesh {...props} />;
    case 'bio-media-balls':
      return <BioBallsMesh {...props} />;
    case 'submersible-pump':
      return <SubmersiblePumpMesh {...props} />;
    case 'straight-pipe':
      return <StraightPipeMesh {...props} />;
    case 'elbow-pipe':
      return <ElbowPipeMesh {...props} />;
    case 'flexible-hose':
      return <FlexibleHoseMesh {...props} />;
    case 'water-inlet':
      return <WaterInletMesh {...props} />;
    case 'water-outlet':
      return <WaterOutletMesh {...props} />;
    default:
      // Fallback: If category is hardscape, use dodecahedron, else box
      return (
        <mesh {...props.interactiveProps} castShadow receiveShadow>
          {object.category === 'hardscape' ? (
            <dodecahedronGeometry args={[object.dimensions.x / 2, 1]} />
          ) : (
            <boxGeometry args={[object.dimensions.x, object.dimensions.y, object.dimensions.z]} />
          )}
          <meshStandardMaterial
            color={object.material.color}
            roughness={object.material.roughness}
            metalness={object.material.metalness}
            transparent={object.material.transparent}
            opacity={object.material.opacity}
            wireframe={props.isWireframeAll || object.material.wireframe}
          />
        </mesh>
      );
  }
};
