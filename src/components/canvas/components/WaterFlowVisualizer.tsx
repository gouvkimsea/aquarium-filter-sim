/**
 * 3D Water Flow Visualizer
 * 
 * Renders dynamic, physics-driven water flow animations inside connected plumbing
 * based on the real flow paths and velocities solved by the hydraulic simulation engine.
 * 
 * Features:
 * - 60 FPS instanced 3D water particles following actual 3D conduit trajectories
 * - Flow direction strictly aligned with physical port-to-port normal vectors
 * - Animation speed proportional to relative calculated flow rate & velocity
 * - Visual highlighting of disconnected ports, dead ends, and stalled pumps
 * - Transparent and cutaway inspection support with depth-tuned luminous materials
 * - Transport controls (Start, Pause, Resume, Reset) and live telemetry HUD
 * - Prominent "Simplified Simulation (Illustrative Estimate)" labeling
 */

import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
} from 'lucide-react';
import { useEditor } from '../../../context/EditorContext';
import { getWorldPortPosition, getComponentPorts } from '../../../utils/connectionGraph';

// Reusable scratch objects to eliminate GC allocation in 60 FPS useFrame loop
const dummy = new THREE.Object3D();
const upVector = new THREE.Vector3(0, 1, 0);

interface PathTrajectory {
  id: string;
  name: string;
  curve: THREE.CurvePath<THREE.Vector3>;
  pathLength: number;
  velocityMs: number;
  flowLph: number;
  flowGph: number;
  isParallelBranch: boolean;
  branchFraction?: number;
}

export const WaterFlowVisualizer: React.FC = () => {
  const {
    objects,
    connections,
    hydraulicResult,
    simulation,
    toggleSimulation,
    resetSimulation,
    setSimulationSpeed,
  } = useEditor();

  const [hudExpanded, setHudExpanded] = useState(false);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const arrowMeshRef = useRef<THREE.InstancedMesh>(null);

  // 1. Build continuous 3D Catmull-Rom curves for each flow path / branch
  const trajectories: PathTrajectory[] = useMemo(() => {
    if (!hydraulicResult || hydraulicResult.status === 'no-pump' || hydraulicResult.status === 'disconnected') {
      return [];
    }

    const objectMap = new Map(objects.map((o) => [o.id, o]));
    const list: PathTrajectory[] = [];

    // Helper to build a 3D curve path from an array of segments
    const buildCurveFromSegments = (
      segments: Array<{
        componentId: string;
        fromPortId: string;
        toPortId: string;
        velocityMs: number;
      }>,
      pathId: string,
      pathName: string,
      flowLph: number,
      flowGph: number,
      isBranch: boolean = false,
      branchFraction?: number
    ): PathTrajectory | null => {
      if (segments.length === 0) return null;

      const curvePath = new THREE.CurvePath<THREE.Vector3>();
      const points: THREE.Vector3[] = [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const comp = objectMap.get(seg.componentId);
        if (!comp) continue;

        const ports = getComponentPorts(comp);
        const fromPort = ports.find((p) => p.id === seg.fromPortId);
        const toPort = ports.find((p) => p.id === seg.toPortId);
        if (!fromPort || !toPort) continue;

        const pA = getWorldPortPosition(comp, fromPort);
        const pB = getWorldPortPosition(comp, toPort);
        const vA = new THREE.Vector3(pA.x, pA.y, pA.z);
        const vB = new THREE.Vector3(pB.x, pB.y, pB.z);

        if (comp.componentType === 'elbow-pipe') {
          // Add curved bend through elbow center
          const elbowCenter = new THREE.Vector3(comp.position.x, comp.position.y, comp.position.z);
          points.push(vA);
          points.push(elbowCenter);
          points.push(vB);
        } else {
          points.push(vA);
          points.push(vB);
        }
      }

      if (points.length < 2) return null;

      // Deduplicate adjacent points that are virtually identical
      const cleanPoints: THREE.Vector3[] = [points[0]];
      for (let i = 1; i < points.length; i++) {
        if (cleanPoints[cleanPoints.length - 1].distanceTo(points[i]) > 0.02) {
          cleanPoints.push(points[i]);
        }
      }

      if (cleanPoints.length < 2) return null;

      // Build Catmull-Rom spline curve
      const spline = new THREE.CatmullRomCurve3(cleanPoints, false, 'centripetal', 0.25);
      curvePath.add(spline);

      const pathLength = curvePath.getLength();
      const avgVelocity = segments.reduce((acc, s) => acc + s.velocityMs, 0) / segments.length;

      return {
        id: pathId,
        name: pathName,
        curve: curvePath,
        pathLength: Math.max(0.2, pathLength),
        velocityMs: Math.max(0.1, avgVelocity),
        flowLph,
        flowGph,
        isParallelBranch: isBranch,
        branchFraction,
      };
    };

    const op = hydraulicResult.operatingPoint;
    const totalLph = op ? op.flowRate.lph : 0;
    const totalGph = op ? op.flowRate.gph : 0;

    // Check for parallel branches first
    if (hydraulicResult.parallelBranches && hydraulicResult.parallelBranches.length > 0) {
      hydraulicResult.parallelBranches.forEach((branch, idx) => {
        const traj = buildCurveFromSegments(
          branch.segments,
          `branch_${idx}`,
          branch.branchName,
          branch.flowRate.lph,
          branch.flowRate.gph,
          true,
          branch.flowFraction
        );
        if (traj) list.push(traj);
      });
    } else {
      // Main series discharge path
      const dischargePath = hydraulicResult.paths.find((p) => p.type === 'discharge');
      if (dischargePath) {
        const traj = buildCurveFromSegments(
          dischargePath.segments,
          'path_main_discharge',
          'Return Plumbing Path',
          totalLph,
          totalGph,
          false
        );
        if (traj) list.push(traj);
      }
    }

    // Optional suction path
    const suctionPath = hydraulicResult.paths.find((p) => p.type === 'suction');
    if (suctionPath) {
      const traj = buildCurveFromSegments(
        suctionPath.segments,
        'path_suction',
        'Intake Suction Path',
        totalLph,
        totalGph,
        false
      );
      if (traj) list.push(traj);
    }

    return list;
  }, [hydraulicResult, objects]);

  // Total particle count allocated across trajectories
  const PARTICLES_PER_PATH = 28;
  const ARROWS_PER_PATH = 6;
  const totalParticleCount = Math.max(1, trajectories.length * PARTICLES_PER_PATH);
  const totalArrowCount = Math.max(1, trajectories.length * ARROWS_PER_PATH);

  // Particle normalized progress arrays [0, 1]
  const particlesProgressRef = useRef<Float32Array>(new Float32Array(100));

  // Initialize progress offsets
  useMemo(() => {
    const arr = new Float32Array(totalParticleCount);
    for (let tIdx = 0; tIdx < trajectories.length; tIdx++) {
      for (let pIdx = 0; pIdx < PARTICLES_PER_PATH; pIdx++) {
        const globalIdx = tIdx * PARTICLES_PER_PATH + pIdx;
        arr[globalIdx] = (pIdx / PARTICLES_PER_PATH) + (Math.random() * 0.02);
      }
    }
    particlesProgressRef.current = arr;
  }, [trajectories.length, totalParticleCount]);

  // Reset particle progress back to initial staggered positions on reset
  useEffect(() => {
    if (simulation.simulatedMinutes === 0 && !simulation.isRunning) {
      const arr = particlesProgressRef.current;
      for (let tIdx = 0; tIdx < trajectories.length; tIdx++) {
        for (let pIdx = 0; pIdx < PARTICLES_PER_PATH; pIdx++) {
          const globalIdx = tIdx * PARTICLES_PER_PATH + pIdx;
          if (globalIdx < arr.length) {
            arr[globalIdx] = pIdx / PARTICLES_PER_PATH;
          }
        }
      }
    }
  }, [simulation.simulatedMinutes, simulation.isRunning, trajectories.length]);

  // Status flags
  const isOperating = hydraulicResult.status === 'solved' || hydraulicResult.status === 'estimated';
  const isDeadHeaded = hydraulicResult.status === 'pump-dead-headed';
  const isDisconnected = hydraulicResult.status === 'disconnected' || hydraulicResult.status === 'dead-end';
  const isNoPump = hydraulicResult.status === 'no-pump';
  const isUnsolved = hydraulicResult.status === 'unsolved' || hydraulicResult.status === 'invalid-network';

  // 2. 60 FPS Frame Loop: Update particle positions along physical trajectories
  useFrame((_, delta) => {
    if (!instancedMeshRef.current || trajectories.length === 0) return;

    const mesh = instancedMeshRef.current;
    const arrowMesh = arrowMeshRef.current;
    const progresses = particlesProgressRef.current;
    const isRunning = simulation.isRunning;
    const simSpeed = simulation.speed;

    let globalParticleIdx = 0;
    let globalArrowIdx = 0;

    for (let tIdx = 0; tIdx < trajectories.length; tIdx++) {
      const traj = trajectories[tIdx];
      const curve = traj.curve;
      const pathLen = traj.pathLength;

      // Speed is proportional to calculated velocity in m/s (scaled for smooth visualization)
      const flowActive = isRunning && isOperating && traj.flowLph > 0 && !isDeadHeaded;
      const baseVelocity = flowActive ? traj.velocityMs : 0;
      // Visual advance speed: scaled so 1 m/s velocity advances ~0.6 normalized units per sec
      const speedRate = flowActive ? (baseVelocity * 0.55 * simSpeed) / pathLen : 0;

      // A. Update Water Droplet Particles
      for (let pIdx = 0; pIdx < PARTICLES_PER_PATH; pIdx++) {
        if (globalParticleIdx >= progresses.length) break;

        let u = progresses[globalParticleIdx];
        if (flowActive) {
          u = (u + speedRate * delta) % 1.0;
          progresses[globalParticleIdx] = u;
        }

        const point = curve.getPointAt(u);
        const tangent = curve.getTangentAt(u);

        if (point) {
          dummy.position.copy(point);
          if (tangent && tangent.lengthSq() > 0.001) {
            dummy.quaternion.setFromUnitVectors(upVector, tangent.normalize());
          }
          // Particle size scales with branch flow fraction
          const scaleMult = traj.isParallelBranch ? Math.max(0.65, (traj.branchFraction || 0.5) * 1.4) : 1.0;
          dummy.scale.set(0.042 * scaleMult, 0.085 * scaleMult, 0.042 * scaleMult);
          dummy.updateMatrix();
          mesh.setMatrixAt(globalParticleIdx, dummy.matrix);
        }
        globalParticleIdx++;
      }

      // B. Update Directional Chevrons / Flow Arrows
      if (arrowMesh) {
        for (let aIdx = 0; aIdx < ARROWS_PER_PATH; aIdx++) {
          if (globalArrowIdx >= totalArrowCount) break;

          // Staggered fixed positions with subtle flowing pulse
          const baseU = (aIdx + 0.5) / ARROWS_PER_PATH;
          const u = flowActive ? (baseU + (Date.now() * 0.0003 * simSpeed) % (1 / ARROWS_PER_PATH)) % 1.0 : baseU;

          const point = curve.getPointAt(u);
          const tangent = curve.getTangentAt(u);

          if (point) {
            dummy.position.copy(point);
            if (tangent && tangent.lengthSq() > 0.001) {
              dummy.quaternion.setFromUnitVectors(upVector, tangent.normalize());
            }
            dummy.scale.set(0.04, 0.06, 0.04);
            dummy.updateMatrix();
            arrowMesh.setMatrixAt(globalArrowIdx, dummy.matrix);
          }
          globalArrowIdx++;
        }
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (arrowMesh) arrowMesh.instanceMatrix.needsUpdate = true;
  });

  // Identify disconnected or open ports for visual alert beacons
  const disconnectedIssues = useMemo(() => {
    if (!isDisconnected && !isDeadHeaded && !isUnsolved) return [];
    const issues: Array<{ id: string; name: string; position: THREE.Vector3; message: string; color: string }> = [];

    if (isDeadHeaded) {
      const pump = objects.find((o) => o.componentType === 'submersible-pump');
      if (pump) {
        issues.push({
          id: 'pump_stalled',
          name: pump.name,
          position: new THREE.Vector3(pump.position.x, pump.position.y + 0.16, pump.position.z),
          message: 'Pump Stalled: Static elevation lift exceeds max head (0 L/h)',
          color: '#f59e0b',
        });
      }
    } else if (isUnsolved) {
      const pump = objects.find((o) => o.componentType === 'submersible-pump');
      if (pump) {
        issues.push({
          id: 'unsolved_network',
          name: pump.name,
          position: new THREE.Vector3(pump.position.x, pump.position.y + 0.16, pump.position.z),
          message: hydraulicResult.warnings[0] || 'Unsolved network topology',
          color: '#ef4444',
        });
      }
    } else if (isDisconnected) {
      // Find open pump discharge
      const pump = objects.find((o) => o.componentType === 'submersible-pump');
      if (pump) {
        const ports = getComponentPorts(pump);
        const discharge = ports.find((p) => p.id === 'discharge');
        if (discharge) {
          const isConn = connections.some(
            (c) => (c.fromComponentId === pump.id && c.fromPortId === discharge.id) ||
                   (c.toComponentId === pump.id && c.toPortId === discharge.id)
          );
          if (!isConn) {
            const pos = getWorldPortPosition(pump, discharge);
            issues.push({
              id: 'pump_open_discharge',
              name: pump.name,
              position: new THREE.Vector3(pos.x, pos.y + 0.12, pos.z),
              message: 'Pump discharge open — No connected pipe',
              color: '#ef4444',
            });
          }
        }
      }

      // Check for plumbing components with disconnected ports
      const plumbingComps = objects.filter((o) =>
        Boolean(o.componentType && ['straight-pipe', 'elbow-pipe', 'flexible-hose'].includes(o.componentType))
      );
      for (const comp of plumbingComps) {
        const ports = getComponentPorts(comp);
        for (const port of ports) {
          const isConn = connections.some(
            (c) => (c.fromComponentId === comp.id && c.fromPortId === port.id) ||
                   (c.toComponentId === comp.id && c.toPortId === port.id)
          );
          if (!isConn) {
            const pos = getWorldPortPosition(comp, port);
            issues.push({
              id: `open_${comp.id}_${port.id}`,
              name: comp.name,
              position: new THREE.Vector3(pos.x, pos.y + 0.12, pos.z),
              message: `Open ${port.name} on ${comp.name}`,
              color: '#f59e0b',
            });
          }
        }
      }
    }

    return issues;
  }, [isDisconnected, isDeadHeaded, isUnsolved, objects, connections, hydraulicResult.warnings]);

  // Telemetry numbers
  const opPoint = hydraulicResult.operatingPoint;
  const flowLph = opPoint ? opPoint.flowRate.lph : 0;
  const flowGph = opPoint ? opPoint.flowRate.gph : 0;
  const totalHeadM = opPoint ? opPoint.totalDynamicHeadM : 0;
  const staticHeadM = opPoint ? opPoint.staticHeadM : 0;
  const frictionHeadM = opPoint ? opPoint.frictionHeadM : 0;
  const minorLossM = opPoint ? opPoint.minorLossHeadM : 0;

  return (
    <group name="water-flow-visualizer-system">
      {/* 1. Luminous Fluid Core Conduit Trails */}
      {trajectories.map((traj) => (
        <mesh key={`trail_${traj.id}`}>
          <tubeGeometry args={[traj.curve, 36, 0.015, 8, false]} />
          <meshBasicMaterial
            color={isDeadHeaded ? '#f59e0b' : '#00f5d4'}
            transparent
            opacity={simulation.isRunning && isOperating && traj.flowLph > 0 ? 0.35 : 0.12}
            depthTest={true}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* 2. Instanced Water Droplet Particles */}
      {trajectories.length > 0 && (
        <instancedMesh
          ref={instancedMeshRef}
          args={[undefined, undefined, totalParticleCount]}
          frustumCulled={false}
        >
          <capsuleGeometry args={[0.018, 0.06, 8, 12]} />
          <meshBasicMaterial
            color={
              isDeadHeaded
                ? '#f59e0b' // Stalled Amber
                : '#00f5d4' // Glowing Cyan Flow
            }
            transparent
            opacity={0.88}
            depthTest={true}
            depthWrite={false}
          />
        </instancedMesh>
      )}

      {/* 3. Directional Chevrons / Flow Arrows */}
      {trajectories.length > 0 && isOperating && flowLph > 0 && (
        <instancedMesh
          ref={arrowMeshRef}
          args={[undefined, undefined, totalArrowCount]}
          frustumCulled={false}
        >
          <coneGeometry args={[0.035, 0.08, 6]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.65}
            depthWrite={false}
          />
        </instancedMesh>
      )}

      {/* 4. Disconnected Port Alert Beacon Glyphs */}
      {disconnectedIssues.map((issue) => (
        <group key={issue.id} position={[issue.position.x, issue.position.y, issue.position.z]}>
          <mesh>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshBasicMaterial color={issue.color} transparent opacity={0.88} />
          </mesh>
          <Html position={[0, 0.15, 0]} center distanceFactor={10} zIndexRange={[120, 0]}>
            <div className="flow-alert-3d-badge">
              <AlertTriangle size={14} className={issue.color === '#ef4444' ? 'text-red-400' : 'text-amber-400'} />
              <span>{issue.message}</span>
            </div>
          </Html>
        </group>
      ))}

      {/* 4. Glassmorphic 3D Viewport Telemetry & Simulation HUD Overlay */}
      <Html
        position={[-3.2, 1.8, 0]}
        center={false}
        style={{ pointerEvents: 'auto', userSelect: 'none' }}
        distanceFactor={16}
        zIndexRange={[90, 0]}
      >
        <div className="flow-telemetry-hud">
          {/* Header & Status Indicator */}
          <div className="hud-header">
            <div className="hud-title-row">
              <Activity size={14} className="text-cyan-400" />
              <span className="hud-title">1D HYDRAULIC SIMULATION</span>
              <span className="hud-tag-estimate">ESTIMATE</span>
            </div>

            <button
              className="hud-toggle-btn"
              onClick={() => setHudExpanded(!hudExpanded)}
              title={hudExpanded ? 'Collapse Telemetry' : 'Expand Hydraulic Details'}
            >
              {hudExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Main Status Pill */}
          <div className={`hud-status-banner ${
            isDeadHeaded ? 'status-deadhead' :
            isDisconnected ? 'status-disconnected' :
            isNoPump ? 'status-nopump' :
            isUnsolved ? 'status-unsolved' :
            simulation.isRunning ? 'status-active' : 'status-paused'
          }`}>
            <span className="status-dot" />
            <span className="status-text">
              {isDeadHeaded
                ? 'PUMP DEAD-HEADED (0 L/h)'
                : isDisconnected
                ? 'NETWORK DISCONNECTED'
                : isNoPump
                ? 'NO ACTIVE PUMP DETECTED'
                : isUnsolved
                ? 'UNSOLVED TOPOLOGY'
                : simulation.isRunning
                ? `ACTIVE FLOW: ${Math.round(flowLph)} L/h (${Math.round(flowGph)} GPH)`
                : 'SIMULATION PAUSED'}
            </span>
          </div>

          {/* Transport Bar Controls */}
          <div className="hud-transport-controls">
            <button
              id="hud-btn-toggle-play"
              className={`hud-btn-play ${simulation.isRunning ? 'running' : 'paused'}`}
              onClick={toggleSimulation}
              title={simulation.isRunning ? 'Pause Flow Animation' : 'Start Flow Animation'}
            >
              {simulation.isRunning ? <Pause size={13} /> : <Play size={13} />}
              <span>{simulation.isRunning ? 'PAUSE' : 'RUN'}</span>
            </button>

            <button
              id="hud-btn-reset-flow"
              className="hud-btn-reset"
              onClick={resetSimulation}
              title="Reset Flow Particles to Start"
            >
              <RotateCcw size={12} />
              <span>RESET</span>
            </button>

            <div className="hud-speed-group">
              {[0.5, 1.0, 2.0].map((spd) => (
                <button
                  key={spd}
                  className={`hud-speed-pill ${simulation.speed === spd ? 'active' : ''}`}
                  onClick={() => setSimulationSpeed(spd)}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Expandable Engineering Telemetry Metrics */}
          {hudExpanded && (
            <div className="hud-details-panel">
              <div className="hud-metric-row">
                <span className="metric-label">Operating Flow:</span>
                <span className="metric-value font-mono">
                  {flowLph.toFixed(1)} L/h ({flowGph.toFixed(1)} GPH)
                </span>
              </div>

              <div className="hud-metric-row">
                <span className="metric-label">Total Dynamic Head (TDH):</span>
                <span className="metric-value font-mono">{totalHeadM.toFixed(2)} m</span>
              </div>

              <div className="hud-metric-row">
                <span className="metric-label">Static Elevation Lift:</span>
                <span className="metric-value font-mono">{staticHeadM.toFixed(2)} m</span>
              </div>

              <div className="hud-metric-row">
                <span className="metric-label">Friction & Minor Losses:</span>
                <span className="metric-value font-mono">{(frictionHeadM + minorLossM).toFixed(3)} m</span>
              </div>

              {/* Parallel Branch Breakdown */}
              {hydraulicResult.parallelBranches && hydraulicResult.parallelBranches.length > 0 && (
                <div className="hud-branches-box">
                  <div className="branches-title">
                    <Layers size={12} className="text-cyan-400" />
                    <span>Parallel Branch Distribution:</span>
                  </div>
                  {hydraulicResult.parallelBranches.map((b) => (
                    <div key={b.branchIndex} className="branch-row">
                      <span className="branch-name">{b.branchName}:</span>
                      <span className="branch-flow font-mono">
                        {Math.round(b.flowRate.lph)} L/h ({(b.flowFraction * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Diagnostics & Warnings */}
              {hydraulicResult.warnings.length > 0 && (
                <div className="hud-warnings-box">
                  {hydraulicResult.warnings.map((w, idx) => (
                    <div key={idx} className="hud-warning-item">
                      <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Disclaimer */}
              <div className="hud-disclaimer">
                <Info size={11} className="text-slate-400 shrink-0" />
                <span>
                  Simplified 1D Darcy-Weisbach / Colebrook-White model. Illustrative estimate derived from nominal pump curves.
                </span>
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
