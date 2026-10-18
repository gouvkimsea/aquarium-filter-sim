import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { EditorObject } from '../../../types/editor';
import { useEditor } from '../../../context/EditorContext';
import {
  toDisplayUnits,
  calculateChambers,
  formatVolume,
  CONTAINER_LIMITS,
} from '../../../utils/filterGeometry';

interface ComponentMeshProps {
  object: EditorObject;
  isWireframeAll?: boolean;
  interactiveProps?: Record<string, any>;
}

// ----------------------------------------------------------------------
// 1. Filter Container: Multi-Mode CAD Filter Basin (Transparent, Opaque, Cutaway)
// ----------------------------------------------------------------------
export const FilterContainerMesh: React.FC<ComponentMeshProps> = ({
  object,
  isWireframeAll,
  interactiveProps,
}) => {
  const { dimensions, material } = object;
  const { viewportSettings, objects, selectedId } = useEditor();

  const isSelected = selectedId === object.id;
  const viewMode = viewportSettings.containerViewMode || 'transparent';
  const showMeasurements = viewportSettings.showMeasurements;
  const unitSystem = viewportSettings.unitSystem;
  const metricUnit = viewportSettings.metricUnit;

  const wallThick = CONTAINER_LIMITS.wallThickness; // 0.04m
  const bottomThick = CONTAINER_LIMITS.bottomThickness; // 0.05m
  const isCutaway = viewMode === 'cutaway';
  const isOpaque = viewMode === 'opaque';

  // Calculate live chambers and usable volumes
  const chambersConfig = useMemo(
    () => calculateChambers(object, objects),
    [object, objects]
  );

  // Material properties configured per view mode
  const wallMaterialProps = useMemo(() => {
    if (isOpaque) {
      return {
        color: '#1e293b',
        roughness: 0.35,
        metalness: 0.3,
        transparent: false,
        opacity: 1.0,
      };
    }
    if (isCutaway) {
      return {
        color: '#1e293b',
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.55,
        transmission: 0.85,
        ior: 1.491,
        thickness: 0.25,
      };
    }
    // Transparent mode (Crystal clear optical acrylic)
    return {
      color: material.color || '#e0f2fe',
      roughness: 0.05,
      metalness: 0.02,
      transparent: true,
      opacity: 0.42,
      transmission: 0.92,
      ior: 1.491,
      thickness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    };
  }, [isOpaque, isCutaway, material.color]);

  // Corner coordinates for 4 silicone corner sealing pillars
  const cornerOffsets = useMemo(() => {
    const halfX = dimensions.x / 2 - wallThick / 2;
    const halfZ = dimensions.z / 2 - wallThick / 2;
    return [
      [-halfX, -halfZ],
      [halfX, -halfZ],
      [-halfX, halfZ],
      [halfX, halfZ],
    ];
  }, [dimensions.x, dimensions.z, wallThick]);

  const cornerPillarHeight = dimensions.y - bottomThick;

  return (
    <group {...interactiveProps}>
      {/* A. Bottom Base Plate */}
      <mesh
        position={[0, -dimensions.y / 2 + bottomThick / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[dimensions.x, bottomThick, dimensions.z]} />
        <meshStandardMaterial
          color={isOpaque ? '#0f172a' : '#1e293b'}
          roughness={0.4}
          metalness={0.2}
          transparent={!isOpaque}
          opacity={isOpaque ? 1.0 : 0.75}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* B. Front Wall:
          - If Cutaway: lowered to a cross-section threshold sill (with neon cut line)
          - If Opaque / Transparent: full height */}
      {isCutaway ? (
        <group position={[0, -dimensions.y / 2 + bottomThick * 1.5, dimensions.z / 2 - wallThick / 2]}>
          {/* Low front cross-section sill */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[dimensions.x, bottomThick * 2, wallThick]} />
            <meshStandardMaterial
              color="#0f172a"
              roughness={0.3}
              metalness={0.2}
              wireframe={isWireframeAll || material.wireframe}
            />
          </mesh>
          {/* Bright Section Cut Edge Highlight Line */}
          <mesh position={[0, bottomThick, 0]}>
            <boxGeometry args={[dimensions.x, 0.02, wallThick * 1.05]} />
            <meshBasicMaterial color="#00f5d4" />
          </mesh>
        </group>
      ) : (
        <mesh
          position={[0, bottomThick / 2, dimensions.z / 2 - wallThick / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[dimensions.x, dimensions.y - bottomThick, wallThick]} />
          <meshPhysicalMaterial
            {...wallMaterialProps}
            wireframe={isWireframeAll || material.wireframe}
          />
        </mesh>
      )}

      {/* C. Back Wall Panel */}
      <mesh
        position={[0, bottomThick / 2, -dimensions.z / 2 + wallThick / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[dimensions.x, dimensions.y - bottomThick, wallThick]} />
        <meshPhysicalMaterial
          {...wallMaterialProps}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* D. Left Wall Panel */}
      <mesh
        position={[-dimensions.x / 2 + wallThick / 2, bottomThick / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[wallThick, dimensions.y - bottomThick, dimensions.z - wallThick * 2]}
        />
        <meshPhysicalMaterial
          {...wallMaterialProps}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* E. Right Wall Panel */}
      <mesh
        position={[dimensions.x / 2 - wallThick / 2, bottomThick / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[wallThick, dimensions.y - bottomThick, dimensions.z - wallThick * 2]}
        />
        <meshPhysicalMaterial
          {...wallMaterialProps}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* F. Corner Marine Silicone Sealing Pillars (Gives crisp structural CAD bounds) */}
      {cornerOffsets.map(([cx, cz], idx) => (
        <mesh
          key={idx}
          position={[cx, bottomThick / 2, cz]}
          castShadow
        >
          <boxGeometry args={[wallThick * 1.02, cornerPillarHeight, wallThick * 1.02]} />
          <meshStandardMaterial
            color={isOpaque ? '#090d16' : '#0f172a'}
            roughness={0.25}
            metalness={0.2}
            wireframe={isWireframeAll}
          />
        </mesh>
      ))}

      {/* G. Top Perimeter Rim Flange */}
      <group position={[0, dimensions.y / 2, 0]}>
        {/* In cutaway mode, only back and side rims are shown */}
        {isCutaway ? (
          <>
            {/* Back rim */}
            <mesh position={[0, 0, -dimensions.z / 2]}>
              <boxGeometry args={[dimensions.x + 0.04, 0.03, wallThick * 1.4]} />
              <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.4} />
            </mesh>
            {/* Left rim */}
            <mesh position={[-dimensions.x / 2, 0, 0]}>
              <boxGeometry args={[wallThick * 1.4, 0.03, dimensions.z]} />
              <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.4} />
            </mesh>
            {/* Right rim */}
            <mesh position={[dimensions.x / 2, 0, 0]}>
              <boxGeometry args={[wallThick * 1.4, 0.03, dimensions.z]} />
              <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.4} />
            </mesh>
          </>
        ) : (
          <mesh>
            <boxGeometry args={[dimensions.x + 0.04, 0.03, dimensions.z + 0.04]} />
            <meshStandardMaterial
              color={isOpaque ? '#0284c7' : '#334155'}
              roughness={0.25}
              metalness={0.4}
              transparent={!isOpaque}
              opacity={0.85}
              wireframe={isWireframeAll}
            />
          </mesh>
        )}
      </group>

      {/* ================================================================ */}
      {/* H. 3D MEASUREMENT LABELS (W × H × D)                             */}
      {/* ================================================================ */}
      {(showMeasurements || isSelected) && (
        <group>
          {/* Width Dimension along front bottom edge */}
          <Html
            position={[0, -dimensions.y / 2 - 0.16, dimensions.z / 2 + 0.12]}
            center
          >
            <div className="cad-dim-badge width-dim">
              <span className="dim-axis">W</span>
              <span className="dim-val">
                {toDisplayUnits(dimensions.x, unitSystem, metricUnit).formatted}
              </span>
            </div>
          </Html>

          {/* Height Dimension along front left corner */}
          <Html
            position={[-dimensions.x / 2 - 0.22, 0, dimensions.z / 2 + 0.12]}
            center
          >
            <div className="cad-dim-badge height-dim">
              <span className="dim-axis">H</span>
              <span className="dim-val">
                {toDisplayUnits(dimensions.y, unitSystem, metricUnit).formatted}
              </span>
            </div>
          </Html>

          {/* Depth Dimension along left side lower edge */}
          <Html
            position={[-dimensions.x / 2 - 0.22, -dimensions.y / 2 - 0.16, 0]}
            center
          >
            <div className="cad-dim-badge depth-dim">
              <span className="dim-axis">D</span>
              <span className="dim-val">
                {toDisplayUnits(dimensions.z, unitSystem, metricUnit).formatted}
              </span>
            </div>
          </Html>
        </group>
      )}

      {/* ================================================================ */}
      {/* I. CHAMBER BOUNDARIES & APPROXIMATE USABLE INTERNAL VOLUME       */}
      {/* ================================================================ */}
      {(isSelected || showMeasurements) && (
        <group>
          {/* Master Container Header Tag */}
          <Html position={[0, dimensions.y / 2 + 0.65, 0]} center>
            <div className="cad-container-header-pill">
              <span className="pill-title">Filter Basin</span>
              <span className="pill-volume">
                Usable: {formatVolume(chambersConfig.totalInternalVolumeLiters, unitSystem)}
              </span>
              <span className="pill-stages">
                ({chambersConfig.chambers.length} Stages)
              </span>
            </div>
          </Html>

          {/* Chamber-specific Boundary Indicators & Usable Volume Pills */}
          {chambersConfig.chambers.map((chamber) => {
            const relMidX = (chamber.startX + chamber.endX) / 2 - object.position.x;
            const relStartX = chamber.startX - object.position.x;
            const relEndX = chamber.endX - object.position.x;

            return (
              <group key={chamber.index}>
                {/* 3D Chamber Volume Badge floating above chamber */}
                <Html position={[relMidX, dimensions.y / 2 + 0.28, 0]} center>
                  <div className="cad-chamber-stage-pill">
                    <div className="chamber-num-badge">CH {chamber.index}</div>
                    <div className="chamber-details">
                      <span className="chamber-vol">
                        {formatVolume(chamber.volumeLiters, unitSystem)}
                      </span>
                      <span className="chamber-width">
                        {toDisplayUnits(chamber.width, unitSystem, metricUnit).formatted}
                      </span>
                    </div>
                  </div>
                </Html>

                {/* Subtle Chamber Boundary Guideline on rim */}
                <mesh position={[relStartX, dimensions.y / 2 + 0.02, 0]}>
                  <boxGeometry args={[0.015, 0.02, dimensions.z * 0.9]} />
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </mesh>
                <mesh position={[relEndX, dimensions.y / 2 + 0.02, 0]}>
                  <boxGeometry args={[0.015, 0.02, dimensions.z * 0.9]} />
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
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
  const { selectedId } = useEditor();
  const isSelected = selectedId === object.id;

  const plateThick = Math.max(0.02, dimensions.x);
  const underflowGapMm = (object.parameters.underflowGapMm as number) || 15;
  const underflowSlotH = Math.min(dimensions.y * 0.4, underflowGapMm / 1000);
  const mainPlateH = Math.max(0.05, dimensions.y - underflowSlotH);

  return (
    <group {...interactiveProps}>
      {/* Main Divider Plate (raised above floor to provide underflow slot) */}
      <mesh position={[0, underflowSlotH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[plateThick, mainPlateH, dimensions.z]} />
        <meshPhysicalMaterial
          color={material.color || '#38bdf8'}
          roughness={0.06}
          metalness={0.02}
          transmission={0.88}
          ior={1.491}
          thickness={0.15}
          transparent={true}
          opacity={0.65}
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

      {/* Selected Divider Information Pill */}
      {isSelected && (
        <Html position={[0, dimensions.y / 2 + 0.35, 0]} center>
          <div className="cad-baffle-select-pill">
            <span className="baffle-name">{object.name}</span>
            <span className="baffle-gap">Underflow: {underflowGapMm}mm</span>
          </div>
        </Html>
      )}
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
              color={material.color || '#f1f5f9'}
              roughness={0.92}
              metalness={0.02}
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
        <meshPhysicalMaterial
          color={material.color || '#e0f2fe'}
          roughness={0.05}
          metalness={0.02}
          transmission={0.92}
          ior={1.491}
          thickness={0.12}
          transparent={true}
          opacity={0.55}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* 90-Degree Curve into Outflow Flare */}
      <mesh position={[flareW * 0.25, stemH * 0.35, 0]} rotation={[0, 0, -Math.PI / 3]}>
        <cylinderGeometry args={[radius * 1.8, radius, flareW * 0.6, 20]} />
        <meshPhysicalMaterial
          color={material.color || '#e0f2fe'}
          roughness={0.05}
          metalness={0.02}
          transmission={0.92}
          ior={1.491}
          thickness={0.12}
          transparent={true}
          opacity={0.55}
          wireframe={isWireframeAll || material.wireframe}
        />
      </mesh>

      {/* Trumpet Lily Flared Bell Mouth */}
      <mesh position={[flareW * 0.5, stemH * 0.5, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[radius * 2.4, radius * 1.5, 0.18, 24, 1, true]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          roughness={0.05}
          metalness={0.02}
          transmission={0.9}
          ior={1.491}
          thickness={0.12}
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
