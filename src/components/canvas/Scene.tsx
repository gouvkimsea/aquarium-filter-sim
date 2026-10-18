import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useEditor } from '../../context/EditorContext';
import type { EditorObject } from '../../types/editor';
import { ReusableFilterMesh } from './components/FilterComponents';
import { PortVisualizer } from './components/PortVisualizer';
import { WaterFlowVisualizer } from './components/WaterFlowVisualizer';

// Selection Highlight Bounding Box
const SelectionHighlight: React.FC<{ object: EditorObject }> = ({ object }) => {
  const { dimensions, position, rotation } = object;
  const rx = ((rotation?.x || 0) * Math.PI) / 180;
  const ry = ((rotation?.y || 0) * Math.PI) / 180;
  const rz = ((rotation?.z || 0) * Math.PI) / 180;

  return (
    <group
      position={[position.x, position.y, position.z]}
      rotation={[rx, ry, rz]}
    >
      <mesh>
        <boxGeometry
          args={[
            dimensions.x * 1.05 + 0.02,
            dimensions.y * 1.05 + 0.02,
            dimensions.z * 1.05 + 0.02,
          ]}
        />
        <meshBasicMaterial
          color="#00f5d4"
          wireframe
          transparent
          opacity={0.8}
        />
      </mesh>
      <Html position={[0, dimensions.y / 2 + 0.25, 0]} center>
        <div className="selection-3d-pill">
          {object.name}
        </div>
      </Html>
    </group>
  );
};

// Subtle CAD Coordinate Axes at Origin
const CoordinateAxes: React.FC = () => {
  return (
    <group position={[-6.5, -2.04, -5.5]}>
      {/* X Axis - Red */}
      <mesh position={[0.75, 0.02, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[1.55, 0.02, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Y Axis - Green */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>

      {/* Z Axis - Blue */}
      <mesh position={[0, 0.02, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <mesh position={[0, 0.02, 1.55]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      <Html position={[1.8, 0.05, 0]} center>
        <span className="axis-label x-axis">X</span>
      </Html>
      <Html position={[0, 1.8, 0]} center>
        <span className="axis-label y-axis">Y</span>
      </Html>
      <Html position={[0, 0.05, 1.8]} center>
        <span className="axis-label z-axis">Z</span>
      </Html>
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
  const filterWaterRef = useRef<THREE.Mesh>(null);
  const waterfallStreamRef = useRef<THREE.Mesh>(null);

  const isWireframeAll = viewportSettings.viewMode === 'wireframe';

  // Aeration microbubble particles
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

  // Frame tick animation for fluids and aeration
  useFrame((_, delta) => {
    if (!simulation.isRunning) return;
    const rate = delta * simulation.speed;

    // Aeration bubble plumes
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

    // Gentle tank water surface oscillation
    if (waterRef.current) {
      waterRef.current.position.y = 0.05 + Math.sin(Date.now() * 0.002 * simulation.speed) * 0.015;
    }

    // Internal filter fluid pulsation
    if (filterWaterRef.current) {
      filterWaterRef.current.position.y = 1.3 + Math.sin(Date.now() * 0.003 * simulation.speed) * 0.008;
    }

    // Filter waterfall cascade stream
    if (waterfallStreamRef.current) {
      waterfallStreamRef.current.scale.y = 1 + Math.sin(Date.now() * 0.009 * simulation.speed) * 0.06;
    }
  });

  // Helper to retrieve an object safely
  const getObj = (id: string) => objects.find((o) => o.id === id && o.visible);

  // Key Objects
  const tankObj = getObj('obj-tank-enclosure');
  const waterObj = getObj('obj-water-body');
  const substrateObj = getObj('obj-substrate-bed');

  // Filter Fluid & Plumbing
  const filterWaterInterior = getObj('obj-filter-water-interior');
  const filterSpillway = getObj('obj-filter-spillway');
  const intakeObj = getObj('obj-intake-pipe');

  // Media Objects
  const mediaStage1 = getObj('obj-media-stage-1');
  const mediaStage2 = getObj('obj-media-stage-2');
  const mediaStage3 = getObj('obj-media-stage-3');

  // Aeration & Hardscape
  const airStoneObj = getObj('obj-air-stone');
  const stoneA = getObj('obj-stone-a');
  const stoneB = getObj('obj-stone-b');

  // Dynamic objects added from library or custom filter/dividers
  const customObjects = objects.filter(
    (o) =>
      o.visible &&
      ![
        'obj-tank-enclosure',
        'obj-water-body',
        'obj-substrate-bed',
        'obj-filter-water-interior',
        'obj-filter-spillway',
        'obj-intake-pipe',
        'obj-media-stage-1',
        'obj-media-stage-2',
        'obj-media-stage-3',
        'obj-air-stone',
        'obj-stone-a',
        'obj-stone-b',
      ].includes(o.id)
  );

  const selectedObj = objects.find((o) => o.id === selectedId);

  // Reusable interactive mesh props - prevents accidental selection of hidden or locked objects
  const makeInteractive = (id: string) => {
    const target = objects.find((o) => o.id === id);
    const isClickable = target && target.visible && !target.locked;

    return {
      onClick: (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        if (!isClickable) return;
        selectObject(id);
      },
      onPointerOver: (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        if (isClickable) {
          document.body.style.cursor = 'pointer';
        }
      },
      onPointerOut: () => {
        document.body.style.cursor = 'auto';
      },
    };
  };

  return (
    <group
      onPointerMissed={() => {
        selectObject(null);
      }}
    >
      {/* ============================================================== */}
      {/* 1. SUBTLE GROUND GRID & SHADOW RECEIVER                        */}
      {/* ============================================================== */}
      {viewportSettings.showGrid && (
        <>
          {/* Major Grid Lines */}
          <gridHelper
            args={[24, 24, '#38bdf8', '#1e293b']}
            position={[0, -2.05, 0]}
          />
          {/* Subtle Ground Plane receiving soft studio shadows */}
          <mesh
            position={[0, -2.06, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[30, 30]} />
            <shadowMaterial opacity={0.25} />
          </mesh>
          <CoordinateAxes />
        </>
      )}

      {/* Selected Object Active 3D Highlight */}
      {selectedObj && selectedObj.visible && (
        <SelectionHighlight object={selectedObj} />
      )}

      {/* ============================================================== */}
      {/* 2. AQUARIUM TANK GLASS ENCLOSURE & RIMS                        */}
      {/* ============================================================== */}
      {tankObj && (
        <group
          position={[tankObj.position.x, tankObj.position.y, tankObj.position.z]}
          {...makeInteractive(tankObj.id)}
        >
          {/* Transparent Glass Walls */}
          <mesh castShadow receiveShadow renderOrder={5}>
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
              metalness={0.05}
              transmission={0.88}
              ior={1.5}
              thickness={0.2}
              wireframe={isWireframeAll || tankObj.material.wireframe}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Top Matte Rim */}
          <mesh position={[0, tankObj.dimensions.y / 2, 0]} castShadow>
            <boxGeometry
              args={[
                tankObj.dimensions.x + 0.15,
                0.12,
                tankObj.dimensions.z + 0.15,
              ]}
            />
            <meshStandardMaterial color="#1a202c" roughness={0.3} metalness={0.6} />
          </mesh>

          {/* Bottom Stand Base Rim */}
          <mesh position={[0, -tankObj.dimensions.y / 2, 0]} castShadow receiveShadow>
            <boxGeometry
              args={[
                tankObj.dimensions.x + 0.15,
                0.15,
                tankObj.dimensions.z + 0.15,
              ]}
            />
            <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.5} />
          </mesh>

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
      {/* 3. TANK WATER BODY & RIVERBED SUBSTRATE                        */}
      {/* ============================================================== */}
      {waterObj && (
        <mesh
          ref={waterRef}
          position={[waterObj.position.x, waterObj.position.y, waterObj.position.z]}
          renderOrder={2}
          {...makeInteractive(waterObj.id)}
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
            transmission={0.82}
            ior={1.33}
            wireframe={isWireframeAll || waterObj.material.wireframe}
          />
        </mesh>
      )}

      {substrateObj && (
        <mesh
          position={[
            substrateObj.position.x,
            substrateObj.position.y,
            substrateObj.position.z,
          ]}
          castShadow
          receiveShadow
          {...makeInteractive(substrateObj.id)}
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
      {/* 4. FILTER CONTAINER & INTERNAL FLUID STREAM                    */}
      {/* ============================================================== */}
      <group position={[0, 0, 0]}>
        {/* Internal Filter Water Fluid Volume */}
        {filterWaterInterior && (
          <mesh
            ref={filterWaterRef}
            position={[
              filterWaterInterior.position.x,
              filterWaterInterior.position.y,
              filterWaterInterior.position.z,
            ]}
            renderOrder={3}
            {...makeInteractive(filterWaterInterior.id)}
          >
            <boxGeometry
              args={[
                filterWaterInterior.dimensions.x,
                filterWaterInterior.dimensions.y,
                filterWaterInterior.dimensions.z,
              ]}
            />
            <meshPhysicalMaterial
              color={filterWaterInterior.material.color}
              transparent
              opacity={filterWaterInterior.material.opacity}
              roughness={0.06}
              transmission={0.8}
              ior={1.33}
              wireframe={isWireframeAll || filterWaterInterior.material.wireframe}
            />
          </mesh>
        )}

        {/* J. Stage 1 Mechanical Foam (Chamber 1) */}
        {mediaStage1 && (
          <mesh
            position={[
              mediaStage1.position.x,
              mediaStage1.position.y,
              mediaStage1.position.z,
            ]}
            castShadow
            renderOrder={4}
            {...makeInteractive(mediaStage1.id)}
          >
            <boxGeometry
              args={[
                mediaStage1.dimensions.x,
                mediaStage1.dimensions.y,
                mediaStage1.dimensions.z,
              ]}
            />
            <meshStandardMaterial
              color={mediaStage1.material.color}
              roughness={mediaStage1.material.roughness}
              metalness={mediaStage1.material.metalness}
              wireframe={isWireframeAll || mediaStage1.material.wireframe}
            />
          </mesh>
        )}

        {/* K. Stage 2 Bio-Ceramic Ring Matrix (Chamber 2) */}
        {mediaStage2 && (
          <mesh
            position={[
              mediaStage2.position.x,
              mediaStage2.position.y,
              mediaStage2.position.z,
            ]}
            castShadow
            renderOrder={4}
            {...makeInteractive(mediaStage2.id)}
          >
            <boxGeometry
              args={[
                mediaStage2.dimensions.x,
                mediaStage2.dimensions.y,
                mediaStage2.dimensions.z,
              ]}
            />
            <meshStandardMaterial
              color={mediaStage2.material.color}
              roughness={mediaStage2.material.roughness}
              metalness={mediaStage2.material.metalness}
              wireframe={isWireframeAll || mediaStage2.material.wireframe}
            />
          </mesh>
        )}

        {/* L. Stage 3 Chemical Activated Carbon (Chamber 3) */}
        {mediaStage3 && (
          <mesh
            position={[
              mediaStage3.position.x,
              mediaStage3.position.y,
              mediaStage3.position.z,
            ]}
            castShadow
            renderOrder={4}
            {...makeInteractive(mediaStage3.id)}
          >
            <boxGeometry
              args={[
                mediaStage3.dimensions.x,
                mediaStage3.dimensions.y,
                mediaStage3.dimensions.z,
              ]}
            />
            <meshStandardMaterial
              color={mediaStage3.material.color}
              roughness={mediaStage3.material.roughness}
              metalness={mediaStage3.material.metalness}
              wireframe={isWireframeAll || mediaStage3.material.wireframe}
            />
          </mesh>
        )}

        {/* M. Filter Waterfall Return Spillway */}
        {filterSpillway && (
          <group
            position={[
              filterSpillway.position.x,
              filterSpillway.position.y,
              filterSpillway.position.z,
            ]}
            {...makeInteractive(filterSpillway.id)}
          >
            <mesh castShadow>
              <boxGeometry
                args={[
                  filterSpillway.dimensions.x,
                  filterSpillway.dimensions.y,
                  filterSpillway.dimensions.z,
                ]}
              />
              <meshStandardMaterial
                color={filterSpillway.material.color}
                roughness={filterSpillway.material.roughness}
                metalness={filterSpillway.material.metalness}
              />
            </mesh>

            {/* Waterfall cascading stream returning to tank */}
            <mesh
              ref={waterfallStreamRef}
              position={[0, -0.28, 0.12]}
              rotation={[0.3, 0, 0]}
              renderOrder={7}
            >
              <planeGeometry args={[0.8, 0.6]} />
              <meshPhysicalMaterial
                color="#7dd3fc"
                transparent
                opacity={0.65}
                roughness={0.05}
                transmission={0.9}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )}

        {/* N. Filter Intake Pipe Assembly */}
        {intakeObj && (
          <group
            position={[
              intakeObj.position.x,
              intakeObj.position.y,
              intakeObj.position.z,
            ]}
            {...makeInteractive(intakeObj.id)}
          >
            {/* Suction Pipe Tube */}
            <mesh castShadow renderOrder={5}>
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
                roughness={0.1}
                transmission={0.8}
                wireframe={isWireframeAll || intakeObj.material.wireframe}
              />
            </mesh>

            {/* Bottom Slotted Strainer Basket */}
            <mesh
              position={[0, -intakeObj.dimensions.y / 2 - 0.15, 0]}
              castShadow
            >
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

            {/* Inflow Directional Arrow Marker */}
            <mesh position={[0, -intakeObj.dimensions.y / 2 + 0.35, 0]}>
              <coneGeometry args={[0.1, 0.2, 8]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          </group>
        )}
      </group>

      {/* ============================================================== */}
      {/* 5. AERATION AIR STONE & MICROBUBBLES                           */}
      {/* ============================================================== */}
      {airStoneObj && (
        <mesh
          position={[
            airStoneObj.position.x,
            airStoneObj.position.y,
            airStoneObj.position.z,
          ]}
          castShadow
          {...makeInteractive(airStoneObj.id)}
        >
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
      )}

      {/* Microbubble Plume */}
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
      {/* 6. HARDSCAPE ROCKS & CUSTOM LIBRARY OBJECTS                    */}
      {/* ============================================================== */}
      {stoneA && (
        <mesh
          position={[stoneA.position.x, stoneA.position.y, stoneA.position.z]}
          rotation={[
            ((stoneA.rotation?.x || 12) * Math.PI) / 180,
            ((stoneA.rotation?.y || 23) * Math.PI) / 180,
            ((stoneA.rotation?.z || 6) * Math.PI) / 180,
          ]}
          castShadow
          receiveShadow
          {...makeInteractive(stoneA.id)}
        >
          <dodecahedronGeometry args={[stoneA.dimensions.x / 2, 1]} />
          <meshStandardMaterial
            color={stoneA.material.color}
            roughness={stoneA.material.roughness}
            metalness={stoneA.material.metalness}
            wireframe={isWireframeAll || stoneA.material.wireframe}
          />
        </mesh>
      )}

      {stoneB && (
        <mesh
          position={[stoneB.position.x, stoneB.position.y, stoneB.position.z]}
          rotation={[
            ((stoneB.rotation?.x || 23) * Math.PI) / 180,
            ((stoneB.rotation?.y || -28) * Math.PI) / 180,
            ((stoneB.rotation?.z || 17) * Math.PI) / 180,
          ]}
          castShadow
          receiveShadow
          {...makeInteractive(stoneB.id)}
        >
          <dodecahedronGeometry args={[stoneB.dimensions.x / 2, 1]} />
          <meshStandardMaterial
            color={stoneB.material.color}
            roughness={stoneB.material.roughness}
            metalness={stoneB.material.metalness}
            wireframe={isWireframeAll || stoneB.material.wireframe}
          />
        </mesh>
      )}

      {/* Dynamic User Filter & Hardscape Objects */}
      {customObjects.map((obj) => (
        <group
          key={obj.id}
          position={[obj.position.x, obj.position.y, obj.position.z]}
          rotation={[
            ((obj.rotation?.x || 0) * Math.PI) / 180,
            ((obj.rotation?.y || 0) * Math.PI) / 180,
            ((obj.rotation?.z || 0) * Math.PI) / 180,
          ]}
        >
          <ReusableFilterMesh
            object={obj}
            isWireframeAll={isWireframeAll}
            interactiveProps={makeInteractive(obj.id)}
          />
        </group>
      ))}
      {/* 3D Connection Ports & Dynamic Plumbing Visualizer */}
      <PortVisualizer />
      {/* 3D Physics-Driven Water Flow Trajectories & Telemetry HUD */}
      <WaterFlowVisualizer />
    </group>
  );
};
