import { useMemo } from 'react';
import * as THREE from 'three';
import { Instances, Instance } from '@react-three/drei';
import { getHeight, getSlope01, HALF, ROCK_ZONES, moisture01 } from '../utils/terrainHeight';

/**
 * Fine ground scatter that ties the rocks to the terrain and adds foreground
 * richness: small pebbles (denser near rocky zones), sparse short dry-grass
 * tufts on the flatter low/mid ground, and small angular debris chips around
 * rocky areas. All instanced and deliberately restrained — a real field, not a
 * game level.
 */

interface Item {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: THREE.Color;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function zoneBoost(x: number, z: number): number {
  let b = 0;
  for (const zone of ROCK_ZONES) {
    const d = Math.hypot(x - zone.x, z - zone.z);
    if (d < zone.r) b = Math.max(b, 1 - d / zone.r);
  }
  return b;
}

function build(): { pebbles: Item[]; blades: Item[]; debris: Item[] } {
  const rng = mulberry32(0x9e37);
  const pebbles: Item[] = [];
  const blades: Item[] = [];
  const debris: Item[] = [];
  const margin = HALF - 6;
  let attempts = 0;

  while (
    (pebbles.length < 420 || blades.length < 540 || debris.length < 240) &&
    attempts < 26000
  ) {
    attempts++;
    const x = (rng() * 2 - 1) * margin;
    const z = (rng() * 2 - 1) * margin;
    const slope = getSlope01(x, z);
    const h = getHeight(x, z);
    const boost = zoneBoost(x, z);

    // Pebbles: broad, denser near rocky zones, mossier/darker near the stream.
    if (pebbles.length < 420 && slope < 0.6 && rng() < 0.4 + boost * 0.5) {
      const s = 0.1 + rng() * 0.24;
      const sh = 0.26 + rng() * 0.14;
      const moist = moisture01(x, z);
      pebbles.push({
        position: [x, h - s * 0.4, z],
        rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
        scale: [s * (0.8 + rng() * 0.5), s * (0.6 + rng() * 0.4), s * (0.8 + rng() * 0.5)],
        color: new THREE.Color(
          sh * (1 - moist * 0.3),
          sh * 0.96 * (1 - moist * 0.05),
          sh * 0.88 * (1 + moist * 0.35),
        ),
      });
    }

    // Dry-grass tufts: flatter low/mid grassy ground, lusher near the stream.
    if (blades.length < 540 && slope < 0.22 && h > -6 && h < 18 && rng() < 0.34) {
      const tuft = 3 + Math.floor(rng() * 3);
      for (let b = 0; b < tuft && blades.length < 540; b++) {
        const bx = x + (rng() * 2 - 1) * 0.5;
        const bz = z + (rng() * 2 - 1) * 0.5;
        const bh = 0.4 + rng() * 0.45;
        const g = 0.3 + rng() * 0.12;
        const moist = moisture01(bx, bz);
        const green = g * (1 + moist * 0.25);
        blades.push({
          position: [bx, getHeight(bx, bz) + bh * 0.5 - 0.05, bz],
          rotation: [(rng() - 0.5) * 0.5, rng() * Math.PI, (rng() - 0.5) * 0.5],
          scale: [1, bh, 1],
          color: new THREE.Color(green * 0.92, green * 1.05, green * (0.55 - moist * 0.1)),
        });
      }
    }

    // Debris chips: small dark angular fragments near rocky zones / steep ground.
    if (debris.length < 240 && (boost > 0.25 || slope > 0.45) && rng() < 0.5) {
      const s = 0.12 + rng() * 0.28;
      const sh = 0.22 + rng() * 0.12;
      debris.push({
        position: [x, getHeight(x, z) - s * 0.3, z],
        rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
        scale: [s * (1.0 + rng() * 0.6), s * (0.3 + rng() * 0.3), s * (1.0 + rng() * 0.6)],
        color: new THREE.Color(sh, sh * 0.95, sh * 0.86),
      });
    }
  }
  return { pebbles, blades, debris };
}

export default function GroundDetails() {
  const { pebbles, blades, debris } = useMemo(() => build(), []);

  return (
    <group>
      <Instances limit={pebbles.length} receiveShadow frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.95} metalness={0} flatShading />
        {pebbles.map((p, i) => (
          <Instance key={i} position={p.position} rotation={p.rotation} scale={p.scale} color={p.color} />
        ))}
      </Instances>

      <Instances limit={debris.length} receiveShadow frustumCulled={false}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.96} metalness={0} flatShading />
        {debris.map((d, i) => (
          <Instance key={i} position={d.position} rotation={d.rotation} scale={d.scale} color={d.color} />
        ))}
      </Instances>

      <Instances limit={blades.length} frustumCulled={false}>
        <coneGeometry args={[0.05, 1, 4, 1]} />
        <meshStandardMaterial roughness={0.85} metalness={0} />
        {blades.map((b, i) => (
          <Instance key={i} position={b.position} rotation={b.rotation} scale={b.scale} color={b.color} />
        ))}
      </Instances>
    </group>
  );
}
