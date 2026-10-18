import React, { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useEditor } from '../../context/EditorContext';
import { findNearbySnapPort } from '../../utils/connectionGraph';
import type { EditorObject } from '../../types/editor';

export const TransformGizmo: React.FC = () => {
  const {
    selectedObject,
    transformMode,
    snapSettings,
    updateObject,
    objects,
    connections,
    connectPorts,
  } = useEditor();

  const transformRef = useRef<TransformControlsImpl>(null);
  const targetRef = useRef<THREE.Group>(null);
  const isDraggingRef = useRef(false);

  // Synchronize target group with selected object state from external updates (e.g. inspector typing)
  useEffect(() => {
    if (!targetRef.current || !selectedObject) return;
    if (isDraggingRef.current) return; // Do not overwrite while user is actively dragging

    const g = targetRef.current;
    g.position.set(
      selectedObject.position.x,
      selectedObject.position.y,
      selectedObject.position.z
    );

    const rx = ((selectedObject.rotation?.x || 0) * Math.PI) / 180;
    const ry = ((selectedObject.rotation?.y || 0) * Math.PI) / 180;
    const rz = ((selectedObject.rotation?.z || 0) * Math.PI) / 180;
    g.rotation.set(rx, ry, rz);
    g.scale.set(1, 1, 1);
  }, [
    selectedObject?.id,
    selectedObject?.position.x,
    selectedObject?.position.y,
    selectedObject?.position.z,
    selectedObject?.rotation?.x,
    selectedObject?.rotation?.y,
    selectedObject?.rotation?.z,
    selectedObject?.dimensions.x,
    selectedObject?.dimensions.y,
    selectedObject?.dimensions.z,
  ]);

  // Hook into TransformControls dragging-changed event to toggle OrbitControls and commit on finish
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;

    const handleDraggingChange = (event: { value: boolean }) => {
      isDraggingRef.current = event.value;

      // When dragging finishes, commit the new transform to EditorContext with undo history
      if (!event.value && targetRef.current && selectedObject) {
        const g = targetRef.current;
        let newPos = {
          x: parseFloat(g.position.x.toFixed(3)),
          y: parseFloat(g.position.y.toFixed(3)),
          z: parseFloat(g.position.z.toFixed(3)),
        };

        const newRot = {
          x: parseFloat(((g.rotation.x * 180) / Math.PI).toFixed(1)),
          y: parseFloat(((g.rotation.y * 180) / Math.PI).toFixed(1)),
          z: parseFloat(((g.rotation.z * 180) / Math.PI).toFixed(1)),
        };

        // If scaling was applied, update dimensions and reset proxy scale
        const scaleX = g.scale.x;
        const scaleY = g.scale.y;
        const scaleZ = g.scale.z;

        const newDim = {
          x: parseFloat(Math.max(0.05, selectedObject.dimensions.x * scaleX).toFixed(3)),
          y: parseFloat(Math.max(0.05, selectedObject.dimensions.y * scaleY).toFixed(3)),
          z: parseFloat(Math.max(0.05, selectedObject.dimensions.z * scaleZ).toFixed(3)),
        };

        g.scale.set(1, 1, 1);

        // Check for magnetic endpoint snapping to nearby compatible port
        let snapCandidate: EditorObject = {
          ...selectedObject,
          position: newPos,
          rotation: newRot,
          dimensions: newDim,
        };

        if (transformMode === 'translate') {
          const snapTarget = findNearbySnapPort(snapCandidate, objects, connections, 0.45);
          if (snapTarget) {
            newPos = snapTarget.snappedPosition;
            g.position.set(newPos.x, newPos.y, newPos.z);
            updateObject(selectedObject.id, {
              position: newPos,
              rotation: newRot,
              dimensions: newDim,
            });
            // Automatically connect snapped endpoints together
            connectPorts(
              snapTarget.sourceObject.id,
              snapTarget.sourcePort.id,
              snapTarget.targetObject.id,
              snapTarget.targetPort.id
            );
            return;
          }
        }

        updateObject(selectedObject.id, {
          position: newPos,
          rotation: newRot,
          dimensions: newDim,
        });
      }
    };

    const ctrl = controls as any;
    ctrl.addEventListener('dragging-changed', handleDraggingChange);
    return () => {
      ctrl.removeEventListener('dragging-changed', handleDraggingChange);
    };
  }, [selectedObject, updateObject, objects, connections, connectPorts, transformMode]);

  // If no object is selected, or object is hidden, or object is locked, do not render gizmo
  if (!selectedObject || !selectedObject.visible || selectedObject.locked) {
    return null;
  }

  const transSnap = snapSettings.enabled ? snapSettings.translationSnap : undefined;
  const rotSnap = snapSettings.enabled
    ? (snapSettings.rotationSnapDeg * Math.PI) / 180
    : undefined;
  const sclSnap = snapSettings.enabled ? snapSettings.scaleSnap : undefined;

  return (
    <TransformControls
      ref={transformRef}
      mode={transformMode}
      size={0.75}
      translationSnap={transSnap}
      rotationSnap={rotSnap}
      scaleSnap={sclSnap}
      space="world"
    >
      <group ref={targetRef} />
    </TransformControls>
  );
};
