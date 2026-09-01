import { useMemo } from 'react';
import * as THREE from 'three';
import { getHeight } from '../utils/terrainHeight';
import { TERRAIN_CONCEPTS } from '../data/terrainConcepts';
import { useSimStore } from '../store';
import { WANDER_RADIUS } from './CameraDirector';

const WALL_COLOR = '#111214';
const SEGMENTS = 96;
const WALL_HEIGHT = 1.6; // m — tall enough to read as a border from any angle, not just underfoot
const BASE_LIFT = 0.05; // m — keeps the bottom edge from z-fighting the ground

/**
 * Vertical "fence" marking the guided-mode wander limit around the current
 * station's anchor: a ribbon that always stands straight up (not slope-
 * aligned), with its bottom edge following the terrain height around the
 * circle — so it reads as a clear border even where the ground rises or
 * dips inside the circle, unlike a flat ring that can sink into a slope.
 * Only the current concept's station shows one.
 */
export default function WanderBoundary() {
  const guidedIndex = useSimStore((s) => s.guidedIndex);
  const concept = TERRAIN_CONCEPTS[guidedIndex];

  const geometry = useMemo(() => {
    if (!concept) return null;
    const cx = concept.position.x;
    const cz = concept.position.z;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2;
      const lx = Math.cos(angle) * WANDER_RADIUS;
      const lz = Math.sin(angle) * WANDER_RADIUS;
      const groundY = getHeight(cx + lx, cz + lz);
      positions.push(lx, groundY + BASE_LIFT, lz);
      positions.push(lx, groundY + BASE_LIFT + WALL_HEIGHT, lz);
    }
    for (let i = 0; i < SEGMENTS; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [concept]);

  if (!concept || !geometry) return null;

  return (
    <group position={[concept.position.x, 0, concept.position.z]}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={WALL_COLOR}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
