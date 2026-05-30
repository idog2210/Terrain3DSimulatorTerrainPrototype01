import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { TerrainConcept } from '../utils/terrainTypes';
import { getHeight, getNormal } from '../utils/terrainHeight';
import { useSimStore } from '../store';
import { registerMarker, unregisterMarker } from '../markerRegistry';

/**
 * A professional survey-marker beacon anchored on the terrain: a slope-aligned
 * ground ring, a slim graphite pole with an accent collar, and a small accent
 * head. While the pointer is locked the crosshair gaze selects it (an invisible
 * hit-sphere makes targeting forgiving); an onClick fallback also works. When
 * selected it shows a larger annotation ring outlining the highlighted area and
 * a gentle emissive breathe — restrained, not a glowing game pickup.
 */
const POLE_COLOR = '#2b2e33';

export default function TerrainMarker({ concept }: { concept: TerrainConcept }) {
  const hitRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const annulusMat = useRef<THREE.MeshBasicMaterial>(null);
  const selected = useSimStore((s) => s.selectedId === concept.id);
  const hovered = useSimStore((s) => s.hoveredId === concept.id);
  const select = useSimStore((s) => s.select);
  const lang = useSimStore((s) => s.lang);

  const groundY = getHeight(concept.position.x, concept.position.z);
  const accent = concept.accent;

  // Orient the ground rings to the surface so they hug sloped ground.
  const ringQuat = useMemo(() => {
    const n = getNormal(concept.position.x, concept.position.z);
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(n[0], n[1], n[2]),
    );
  }, [concept.position.x, concept.position.z]);

  // Register the (invisible) hit-sphere as the gaze-selectable target.
  useEffect(() => {
    const hit = hitRef.current;
    if (!hit) return;
    hit.userData.conceptId = concept.id;
    registerMarker({ id: concept.id, object: hit });
    return () => unregisterMarker(hit);
  }, [concept.id]);

  useFrame((state) => {
    const head = headRef.current;
    if (head) {
      const target = selected || hovered ? 1.22 : 1;
      head.scale.setScalar(THREE.MathUtils.lerp(head.scale.x, target, 0.15));
    }
    if (annulusMat.current && selected) {
      const t = state.clock.getElapsedTime();
      annulusMat.current.opacity = 0.34 + Math.sin(t * 2) * 0.12;
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    select(concept.id);
  };

  // Bright enough (in linear HDR) to pass the bloom luminance threshold so the
  // beacon heads glow, while the terrain stays below it.
  const emissive = selected ? 2.8 : hovered ? 1.8 : 1.1;

  return (
    <group position={[concept.position.x, groundY, concept.position.z]}>
      {/* Annotation ring outlining the highlighted concept area (selected only). */}
      {selected && (
        <mesh quaternion={ringQuat} position-y={0.12}>
          <ringGeometry args={[10.4, 11.2, 80]} />
          <meshBasicMaterial
            ref={annulusMat}
            color={accent}
            transparent
            opacity={0.34}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Compact base ring at the pin. */}
      <mesh quaternion={ringQuat} position-y={0.16}>
        <ringGeometry args={[1.7, 2.1, 56]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={selected ? 0.85 : 0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Graphite pole. */}
      <mesh position-y={2.4} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 4.8, 10]} />
        <meshStandardMaterial color={POLE_COLOR} roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Accent collar near the top. */}
      <mesh position-y={4.5}>
        <cylinderGeometry args={[0.09, 0.09, 0.34, 14]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} roughness={0.4} />
      </mesh>

      {/* Small accent head. */}
      <mesh ref={headRef} position-y={5.15}>
        <sphereGeometry args={[0.42, 20, 16]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={emissive}
          toneMapped={false}
          roughness={0.35}
        />
      </mesh>

      {/* Invisible, forgiving gaze / click target. */}
      <mesh ref={hitRef} position-y={5.0} onClick={onClick}>
        <sphereGeometry args={[1.2, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Caption. */}
      <Html position={[0, 6.1, 0]} center distanceFactor={24} zIndexRange={[30, 0]} pointerEvents="none">
        <span className={'marker-label' + (selected ? ' selected' : '')}>{concept.title[lang]}</span>
      </Html>
    </group>
  );
}
