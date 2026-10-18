import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import { useEditor } from '../../../context/EditorContext';
import {
  getComponentPorts,
  getWorldPortPosition,
  getWorldPortNormal,
  findEdgeForPort,
  getConnectedPartner,
  validateConnection,
  findNearbySnapPort,
} from '../../../utils/connectionGraph';
import type { ConnectionPort, EditorObject } from '../../../types/editor';

interface SinglePortMarkerProps {
  object: EditorObject;
  port: ConnectionPort;
  isConnected: boolean;
  isActiveSource: boolean;
  canConnectToActive: boolean;
  onPortClick: (e: any) => void;
  partnerInfo?: { componentName: string; portName: string } | null;
}

const SinglePortMarker: React.FC<SinglePortMarkerProps> = ({
  object,
  port,
  isConnected,
  isActiveSource,
  canConnectToActive,
  onPortClick,
  partnerInfo,
}) => {
  const worldPos = useMemo(() => getWorldPortPosition(object, port), [object, port]);
  const worldNorm = useMemo(() => getWorldPortNormal(object, port), [object, port]);

  // Compute rotation matrix to align marker with port normal
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const target = new THREE.Vector3(worldNorm.x, worldNorm.y, worldNorm.z).normalize();
    if (target.lengthSq() > 0.001) {
      q.setFromUnitVectors(up, target);
    }
    return q;
  }, [worldNorm]);

  const euler = useMemo(() => {
    const e = new THREE.Euler();
    e.setFromQuaternion(quaternion);
    return [e.x, e.y, e.z] as [number, number, number];
  }, [quaternion]);

  // Styling based on state
  const ringColor = isActiveSource
    ? '#fbbf24' // Radiant Gold
    : isConnected
    ? '#10b981' // Radiant Green
    : canConnectToActive
    ? '#00f5d4' // Radiant Cyan
    : '#f97316'; // Amber / Orange

  const radius = port.diameterMm ? Math.max(0.045, port.diameterMm / 200) : 0.08;

  return (
    <group position={[worldPos.x, worldPos.y, worldPos.z]}>
      {/* 3D Oriented Port Ring & Flange */}
      <group rotation={euler}>
        {/* Ring Torus */}
        <mesh
          onClick={onPortClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <torusGeometry args={[radius, 0.018, 12, 28]} />
          <meshStandardMaterial
            color={ringColor}
            emissive={ringColor}
            emissiveIntensity={isActiveSource ? 0.9 : isConnected ? 0.45 : 0.65}
            roughness={0.2}
            metalness={0.4}
          />
        </mesh>

        {/* Normal Direction Indicator Arrow */}
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.08, 8]} />
          <meshBasicMaterial color={ringColor} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <coneGeometry args={[0.024, 0.05, 8]} />
          <meshBasicMaterial color={ringColor} />
        </mesh>
      </group>

      {/* Floating CAD HUD Tag */}
      <Html position={[0, 0.16, 0]} center distanceFactor={12} zIndexRange={[100, 0]}>
        <div
          className={`port-3d-hud ${
            isActiveSource
              ? 'port-hud-active'
              : isConnected
              ? 'port-hud-connected'
              : canConnectToActive
              ? 'port-hud-target'
              : 'port-hud-open'
          }`}
          onClick={onPortClick}
          title={`Click to ${isConnected ? 'inspect or disconnect' : 'connect'} port`}
        >
          <div className="port-hud-header">
            <span className="port-dir-badge">
              {port.direction === 'in' ? 'IN' : port.direction === 'out' ? 'OUT' : 'BIO'}
            </span>
            <span className="port-name-label">{port.name}</span>
          </div>

          <div className="port-hud-sub">
            {isConnected ? (
              <span className="port-state-connected">
                Linked: {partnerInfo ? `${partnerInfo.componentName} (${partnerInfo.portName})` : 'Connected'}
              </span>
            ) : isActiveSource ? (
              <span className="port-state-pulsing">Selected • Click Target Port</span>
            ) : canConnectToActive ? (
              <span className="port-state-connectable">Click to Connect</span>
            ) : (
              <span className="port-state-open">Open Port (Snap Ready)</span>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
};

export const PortVisualizer: React.FC = () => {
  const {
    objects,
    selectedId,
    connections,
    activeConnectingPort,
    startConnecting,
    cancelConnecting,
    connectPorts,
    disconnectPorts,
  } = useEditor();

  const selectedObject = useMemo(
    () => objects.find((o) => o.id === selectedId) || null,
    [objects, selectedId]
  );

  const activeSourceObject = useMemo(
    () =>
      activeConnectingPort
        ? objects.find((o) => o.id === activeConnectingPort.componentId) || null
        : null,
    [objects, activeConnectingPort]
  );

  const activeSourcePort = useMemo(() => {
    if (!activeSourceObject || !activeConnectingPort) return null;
    const ports = getComponentPorts(activeSourceObject);
    return ports.find((p) => p.id === activeConnectingPort.portId) || null;
  }, [activeSourceObject, activeConnectingPort]);

  // Which objects should display ports?
  // 1. If activeConnectingPort is non-null, show ALL connectable objects' ports so user can click a target!
  // 2. If an object is selected, show its ports, its connected partners' ports, and nearby compatible targets.
  const visiblePortObjects = useMemo(() => {
    if (activeConnectingPort) {
      return objects.filter((o) => o.visible && getComponentPorts(o).length > 0);
    }
    if (selectedObject && selectedObject.visible) {
      const ports = getComponentPorts(selectedObject);
      if (ports.length > 0) {
        const partnerIds = new Set<string>();
        connections.forEach((e) => {
          if (e.fromComponentId === selectedObject.id) partnerIds.add(e.toComponentId);
          if (e.toComponentId === selectedObject.id) partnerIds.add(e.fromComponentId);
        });

        // Also include nearby compatible objects within 1.2m
        const nearbyIds = new Set<string>();
        objects.forEach((o) => {
          if (o.id !== selectedObject.id && o.visible && getComponentPorts(o).length > 0) {
            const dx = o.position.x - selectedObject.position.x;
            const dy = o.position.y - selectedObject.position.y;
            const dz = o.position.z - selectedObject.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 1.2) {
              nearbyIds.add(o.id);
            }
          }
        });

        return objects.filter(
          (o) =>
            o.id === selectedObject.id ||
            partnerIds.has(o.id) ||
            nearbyIds.has(o.id)
        );
      }
    }
    return [];
  }, [objects, selectedObject, connections, activeConnectingPort]);

  // Magnetic Snapping Guide when an object is positioned near a compatible open port
  const nearbySnap = useMemo(() => {
    if (!selectedObject || activeConnectingPort) return null;
    return findNearbySnapPort(selectedObject, objects, connections, 0.55);
  }, [selectedObject, objects, connections, activeConnectingPort]);

  // Compute 3D spline lines for existing connection edges
  const connectionLines = useMemo(() => {
    return connections
      .map((edge) => {
        const fromObj = objects.find((o) => o.id === edge.fromComponentId);
        const toObj = objects.find((o) => o.id === edge.toComponentId);
        if (!fromObj || !toObj) return null;

        const fromPorts = getComponentPorts(fromObj);
        const toPorts = getComponentPorts(toObj);
        const fromPort = fromPorts.find((p) => p.id === edge.fromPortId);
        const toPort = toPorts.find((p) => p.id === edge.toPortId);
        if (!fromPort || !toPort) return null;

        const posA = getWorldPortPosition(fromObj, fromPort);
        const posB = getWorldPortPosition(toObj, toPort);

        return {
          id: edge.id,
          points: [
            [posA.x, posA.y, posA.z] as [number, number, number],
            [posB.x, posB.y, posB.z] as [number, number, number],
          ],
        };
      })
      .filter(Boolean) as Array<{ id: string; points: [number, number, number][] }>;
  }, [connections, objects]);

  // Handle port click
  const handlePortClick = (obj: EditorObject, port: ConnectionPort) => {
    if (!activeConnectingPort) {
      // Not connecting yet
      const existingEdge = findEdgeForPort(connections, obj.id, port.id);
      if (existingEdge) {
        // Already connected: clicking allows user to disconnect
        const partner = getConnectedPartner(existingEdge, obj.id, port.id);
        const partnerObj = partner ? objects.find((o) => o.id === partner.componentId) : null;
        const msg = `Port "${port.name}" is connected to ${partnerObj ? partnerObj.name : 'another component'}.\n\nDo you want to disconnect it?`;
        if (window.confirm(msg)) {
          disconnectPorts(obj.id, port.id);
        }
      } else {
        // Open port: start connecting
        startConnecting(obj.id, port.id);
      }
    } else {
      // In active connecting mode
      if (
        activeConnectingPort.componentId === obj.id &&
        activeConnectingPort.portId === port.id
      ) {
        // Clicked itself: cancel
        cancelConnecting();
        return;
      }

      // Try connecting
      const result = connectPorts(
        activeConnectingPort.componentId,
        activeConnectingPort.portId,
        obj.id,
        port.id
      );

      if (!result.success && result.message) {
        alert(result.message);
      }
    }
  };

  return (
    <group>
      {/* 1. Existing Active Connection Flow Lines */}
      {connectionLines.map((line) => (
        <group key={line.id}>
          <Line
            points={line.points}
            color="#10b981"
            lineWidth={3.5}
            transparent
            opacity={0.8}
            dashed={false}
          />
          {/* Subtle glow halo line */}
          <Line
            points={line.points}
            color="#00f5d4"
            lineWidth={7}
            transparent
            opacity={0.25}
          />
        </group>
      ))}

      {/* 2. Magnetic Snapping Guide Indicator */}
      {nearbySnap && (
        <group>
          <Line
            points={[
              [nearbySnap.sourceWorldPos.x, nearbySnap.sourceWorldPos.y, nearbySnap.sourceWorldPos.z],
              [nearbySnap.targetWorldPos.x, nearbySnap.targetWorldPos.y, nearbySnap.targetWorldPos.z],
            ]}
            color="#38bdf8"
            lineWidth={4}
            dashed
            dashScale={12}
            dashSize={0.08}
            gapSize={0.05}
          />
          <Html
            position={[
              (nearbySnap.sourceWorldPos.x + nearbySnap.targetWorldPos.x) / 2,
              (nearbySnap.sourceWorldPos.y + nearbySnap.targetWorldPos.y) / 2 + 0.08,
              (nearbySnap.sourceWorldPos.z + nearbySnap.targetWorldPos.z) / 2,
            ]}
            center
            distanceFactor={10}
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                backgroundColor: 'rgba(14, 165, 233, 0.95)',
                color: '#fff',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                border: '1px solid #7dd3fc',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>🧲 Magnetic Snap</span>
              <span style={{ opacity: 0.85, fontSize: '10px' }}>({Math.round(nearbySnap.distance * 100)}cm)</span>
            </div>
          </Html>
        </group>
      )}

      {/* 3. Interactive Ports for Selected & Target Objects */}
      {visiblePortObjects.map((obj) => {
        const ports = getComponentPorts(obj);
        return ports.map((port) => {
          const isConnected = !!findEdgeForPort(connections, obj.id, port.id);
          const isActiveSource =
            activeConnectingPort?.componentId === obj.id &&
            activeConnectingPort?.portId === port.id;

          let canConnectToActive = false;
          if (activeSourceObject && activeSourcePort && !isActiveSource && !isConnected) {
            const val = validateConnection(
              activeSourceObject,
              activeSourcePort,
              obj,
              port,
              connections
            );
            canConnectToActive = val.valid;
          }

          // Partner info if connected
          let partnerInfo: { componentName: string; portName: string } | null = null;
          if (isConnected) {
            const edge = findEdgeForPort(connections, obj.id, port.id);
            if (edge) {
              const partner = getConnectedPartner(edge, obj.id, port.id);
              if (partner) {
                const partnerObj = objects.find((o) => o.id === partner.componentId);
                const partnerPorts = partnerObj ? getComponentPorts(partnerObj) : [];
                const partnerPort = partnerPorts.find((p) => p.id === partner.portId);
                if (partnerObj && partnerPort) {
                  partnerInfo = {
                    componentName: partnerObj.name,
                    portName: partnerPort.name,
                  };
                }
              }
            }
          }

          return (
            <SinglePortMarker
              key={`${obj.id}_${port.id}`}
              object={obj}
              port={port}
              isConnected={isConnected}
              isActiveSource={isActiveSource}
              canConnectToActive={canConnectToActive}
              onPortClick={(e) => {
                e.stopPropagation();
                handlePortClick(obj, port);
              }}
              partnerInfo={partnerInfo}
            />
          );
        });
      })}
    </group>
  );
};
