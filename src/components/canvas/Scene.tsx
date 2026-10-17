import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useEditor } from '../../context/EditorContext';
import type { EditorObject } from '../../types/editor';

// Selection Highlight Bounding Box
const SelectionHighlight: React.FC<{ object: EditorObject }> = ({ object }) => {
  const { dimensions, position } = object;
  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh>
        <boxGeometry
          args={[
            dimensions.x * 1.05,
            dimensions.y * 1.05,
            dimensions.z * 1.05,
          ]}
        />
        <meshBasicMaterial
          color="#00f5d4"
          wireframe
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
};

export const Scene: React.FC = () => {
  const {
    objects,
    selectedId,
    selectObject,
    viewportSettings,
    simulation,
  } = useEditor();

  const bubblesRef = useRef<THREE.Points>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const outflowWaterRef = useRef<THREE.Mesh>(null);

  const isWireframeAll = viewportSettings.viewMode === 'wireframe';

  // Bubbles particle generation
  const bubbleCount = 120;
  const [bubblePositions, bubbleSpeeds] = useMemo(() => {
    const pos = new Float32Array(bubbleCount * 3);
    const spd = new Float32Array(bubbleCount);
    for (let i = 0; i < bubbleCount; i++) {
      pos[i * 3] = -2.0 + (Math.random() - 0.5) * 0.8;
      pos[i * 3 + 1] = -1.6 + Math.random() * 3.0;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      spd[i] = 0.3 + Math.random() * 0.5;
    }
    return [pos, spd];
  }, [bubbleCount]);

  // Animation frame loop
  useFrame((_, delta) => {
    if (!simulation.isRunning) return;

    const rate = delta * simulation.speed;

    // Animate bubble particles
    if (bubblesRef.current) {
      const posArray = bubblesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < bubbleCount; i++) {
        posArray[i * 3 + 1] += bubbleSpeeds[i] * rate;
        if (posArray[i * 3 + 1] > 1.6) {
          posArray[i * 3 + 1] = -1.6;
          posArray[i * 3] = -2.0 + (Math.random() - 0.5) * 0.8;
        }
      }
      bubblesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Subtle water surface oscillation
    if (waterRef.current) {
      waterRef.current.position.y = 0.05 + Math.sin(Date.now() * 0.002 * simulation.speed) * 0.015;
    }

    // Filter waterfall stream return
    if (outflowWaterRef.current) {
      outflowWaterRef.current.scale.y = 1 + Math.sin(Date.now() * 0.009 * simulation.speed) * 0.06;
    }
  });

  // Find specific key objects
  const tankObj = objects.find((o) => o.id === 'obj-tank-enclosure' && o.visible);
  const waterObj = objects.find((o) => o.id === 'obj-water-body' && o.visible);
  const substrateObj = objects.find((o) => o.id === 'obj-substrate-bed' && o.visible);
  const filterObj = objects.find((o) => o.id === 'obj-filter-unit' && o.visible);
  const intakeObj = objects.find((o) => o.id === 'obj-intake-pipe' && o.visible);
  const airStoneObj = objects.find((o) => o.id === 'obj-air-stone' && o.visible);

  // Dynamic objects (custom components added from library or media items)
  const otherObjects = objects.filter(
    (o) =>
      o.visible &&
      ![
        'obj-tank-enclosure',
        'obj-water-body',
        'obj-substrate-bed',
        'obj-filter-unit',
        'obj-intake-pipe',
        'obj-air-stone',
      ].includes(o.id)
  );

  const selectedObj = objects.find((o) => o.id === selectedId);

  return (
    <group
      onPointerMissed={() => {
        // Deselect when clicking empty space
        selectObject(null);
      }}
    >
      {/* 3D Coordinate Grid */}
      {viewportSettings.showGrid && (
        <gridHelper
          args={[20, 20, '#00f5d4', '#1e293b']}
          position={[0, -2.05, 0]}
        />
      )}

      {/* Selected Object Bounding Box Highlight */}
      {selectedObj && selectedObj.visible && (
        <SelectionHighlight object={selectedObj} />
      )}

      {/* ============================================================== */}
      {/* 1. TANK ENCLOSURE GLASS & RIMS                                 */}
      {/* ============================================================== */}
      {tankObj && (
        <group
          position={[tankObj.position.x, tankObj.position.y, tankObj.position.z]}
          onClick={(e) => {
            e.stopPropagation();
            selectObject(tankObj.id);
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          {/* Main Glass Walls */}
          <mesh>
            <boxGeometry
              args={[
                tankObj.dimensions.x,
                tankObj.dimensions.y,
                tankObj.dimensions.z,
              ]}
            />
            <meshPhysicalMaterial
              color={tankObj.material.color}
              transparent
              opacity={tankObj.material.opacity}
              roughness={tankObj.material.roughness}
              transmission={0.88}
              ior={1.5}
              thickness={0.2}
              wireframe={isWireframeAll || tankObj.material.wireframe}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Top & Bottom Rims */}
          <mesh position={[0, tankObj.dimensions.y / 2, 0]}>
            <boxGeometry
              args={[
                tankObj.dimensions.x + 0.15,
                0.12,
                tankObj.dimensions.z + 0.15,
              ]}
            />
            <meshStandardMaterial color="#1a202c" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[0, -tankObj.dimensions.y / 2, 0]}>
            <boxGeometry
              args={[
                tankObj.dimensions.x + 0.15,
                0.15,
                tankObj.dimensions.z + 0.15,
              ]}
            />
            <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.5} />
          </mesh>

          {/* 3D In-Scene Measurement HUD Labels */}
          {viewportSettings.showMeasurements && (
            <Html position={[0, tankObj.dimensions.y / 2 + 0.35, 0]} center>
              <div className="canvas-measure-tag">
                {viewportSettings.unitSystem === 'metric'
                  ? 'Tank: 120 × 45 × 50 cm (270 L)'
                  : 'Tank: 48 × 18 × 21 in (71.3 Gal)'}
              </div>
            </Html>
          )}
        </group>
      )}

      {/* ============================================================== */}
      {/* 2. WATER VOLUME                                                */}
      {/* ============================================================== */}
      {waterObj && (
        <mesh
          ref={waterRef}
          position={[waterObj.position.x, waterObj.position.y, waterObj.position.z]}
          onClick={(e) => {
            e.stopPropagation();
            selectObject(waterObj.id);
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <boxGeometry
            args={[
              waterObj.dimensions.x,
              waterObj.dimensions.y,
              waterObj.dimensions.z,
            ]}
          />
          <meshPhysicalMaterial
            color={waterObj.material.color}
            transparent
            opacity={waterObj.material.opacity}
            roughness={waterObj.material.roughness}
            transmission={0.8}
            ior={1.33}
            wireframe={isWireframeAll || waterObj.material.wireframe}
          />
        </mesh>
      )}

      {/* ============================================================== */}
      {/* 3. SUBSTRATE BED                                               */}
      {/* ============================================================== */}
      {substrateObj && (
        <mesh
          position={[
            substrateObj.position.x,
            substrateObj.position.y,
            substrateObj.position.z,
          ]}
          onClick={(e) => {
            e.stopPropagation();
            selectObject(substrateObj.id);
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <boxGeometry
            args={[
              substrateObj.dimensions.x,
              substrateObj.dimensions.y,
              substrateObj.dimensions.z,
            ]}
          />
          <meshStandardMaterial
            color={substrateObj.material.color}
            roughness={substrateObj.material.roughness}
            metalness={substrateObj.material.metalness}
            wireframe={isWireframeAll || substrateObj.material.wireframe}
          />
        </mesh>
      )}

      {/* ============================================================== */}
      {/* 4. HOB FILTER UNIT & INTAKE TUBE                               */}
      {/* ============================================================== */}
      {filterObj && (
        <group
          position={[
            filterObj.position.x,
            filterObj.position.y,
            filterObj.position.z,
          ]}
          onClick={(e) => {
            e.stopPropagation();
            selectObject(filterObj.id);
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          {/* Main Housing Box */}
          <mesh position={[0, 0.4, -0.45]}>
            <boxGeometry
              args={[
                filterObj.dimensions.x,
                filterObj.dimensions.y,
                filterObj.dimensions.z,
              ]}
            />
            <meshPhysicalMaterial
              color={filterObj.material.color}
              transparent
              opacity={filterObj.material.opacity}
              roughness={filterObj.material.roughness}
              metalness={filterObj.material.metalness}
              wireframe={isWireframeAll || filterObj.material.wireframe}
            />
          </mesh>

          {/* Lid */}
          <mesh position={[0, 1.25, -0.45]}>
            <boxGeometry
              args={[
                filterObj.dimensions.x + 0.05,
                0.1,
                filterObj.dimensions.z + 0.05,
              ]}
            />
            <meshStandardMaterial color="#0f172a" roughness={0.3} />
          </mesh>

          {/* Spillway Lip */}
          <mesh position={[0.1, 0.3, 0.05]}>
            <boxGeometry args={[0.8, 0.08, 0.3]} />
            <meshStandardMaterial color="#475569" roughness={0.2} metalness={0.5} />
          </mesh>

          {/* Flow Return Stream */}
          {filterObj.parameters.motorStatus !== false && (
            <mesh ref={outflowWaterRef} position={[0.1, -0.05, 0.15]}>
              <planeGeometry args={[0.75, 0.65]} />
              <meshPhysicalMaterial
                color="#7dd3fc"
                transparent
                opacity={0.65}
                roughness={0.05}
                transmission={0.9}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {viewportSettings.showMeasurements && (
            <Html position={[0, 1.5, -0.45]} center>
              <div className="canvas-measure-tag filter-tag">
                {filterObj.parameters.flowRateGPH} GPH
              </div>
            </Html>
          )}
        </group>
      )}

      {/* Intake Tube Assembly */}
      {intakeObj && (
        <group
          position={[
            intakeObj.position.x,
            intakeObj.position.y,
            intakeObj.position.z,
          ]}
          onClick={(e) => {
            e.stopPropagation();
            selectObject(intakeObj.id);
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          {/* Suction Pipe */}
          <mesh>
            <cylinderGeometry
              args={[
                intakeObj.dimensions.x / 2,
                intakeObj.dimensions.x / 2,
                intakeObj.dimensions.y,
                16,
              ]}
            />
            <meshPhysicalMaterial
              color={intakeObj.material.color}
              transparent
              opacity={intakeObj.material.opacity}
              roughness={intakeObj.material.roughness}
              transmission={0.8}
              wireframe={isWireframeAll || intakeObj.material.wireframe}
            />
          </mesh>

          {/* Bottom Slotted Strainer */}
          <mesh position={[0, -intakeObj.dimensions.y / 2 - 0.15, 0]}>
            <cylinderGeometry
              args={[
                intakeObj.dimensions.x * 0.75,
                intakeObj.dimensions.x * 0.5,
                0.35,
                12,
              ]}
            />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
        </group>
      )}

      {/* ============================================================== */}
      {/* 5. AERATION AIR STONE & BUBBLE PARTICLES                       */}
      {/* ============================================================== */}
      {airStoneObj && (
        <group
          position={[
            airStoneObj.position.x,
            airStoneObj.position.y,
            airStoneObj.position.z,
          ]}
          onClick={(e) => {
            e.stopPropagation();
            selectObject(airStoneObj.id);
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          {/* Air stone diffuser block */}
          <mesh>
            <boxGeometry
              args={[
                airStoneObj.dimensions.x,
                airStoneObj.dimensions.y,
                airStoneObj.dimensions.z,
              ]}
            />
            <meshStandardMaterial
              color={airStoneObj.material.color}
              roughness={airStoneObj.material.roughness}
              metalness={airStoneObj.material.metalness}
              wireframe={isWireframeAll || airStoneObj.material.wireframe}
            />
          </mesh>
        </group>
      )}

      {/* Floating Microbubble Plume (Active if air stone is active) */}
      {airStoneObj && airStoneObj.parameters.bubblePlumeActive !== false && (
        <points ref={bubblesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[bubblePositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.065}
            color="#caf0f8"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* ============================================================== */}
      {/* 6. DYNAMIC OBJECTS (Media, Extra Filters, Rocks)               */}
      {/* ============================================================== */}
      {otherObjects.map((obj) => (
        <mesh
          key={obj.id}
          position={[obj.position.x, obj.position.y, obj.position.z]}
          onClick={(e) => {
            e.stopPropagation();
            selectObject(obj.id);
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          {obj.category === 'hardscape' ? (
            <dodecahedronGeometry args={[obj.dimensions.x / 2, 1]} />
          ) : (
            <boxGeometry
              args={[obj.dimensions.x, obj.dimensions.y, obj.dimensions.z]}
            />
          )}
          <meshStandardMaterial
            color={obj.material.color}
            roughness={obj.material.roughness}
            metalness={obj.material.metalness}
            transparent={obj.material.transparent}
            opacity={obj.material.opacity}
            wireframe={isWireframeAll || obj.material.wireframe}
          />
        </mesh>
      ))}
    </group>
  );
};
