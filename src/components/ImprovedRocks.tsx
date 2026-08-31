import { useMemo } from 'react';
import * as THREE from 'three';
import { Instances, Instance } from '@react-three/drei';
import { getHeight, getSlope01, HALF, ROCK_ZONES, moisture01 } from '../utils/terrainHeight';
import { useOptionalPBR } from '../utils/useOptionalTextures';
import { makeRockGeometry } from '../utils/rockGeometry';

/**
 * Boulders and medium rocks built from several noise-displaced icosahedron
 * geometries (lumpy and irregular — not toy spheres), scattered deterministically
 * over the steepest ground and the designated rocky zones / foreground outcrop,
 * sunk into the terrain, and instanced per geometry variant. Cast + receive
 * shadows. Optional local rock PBR textures are used when present.
 */

const VARIANTS = 5;

interface Placement {
  variant: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: THREE.Color;
  /** Lighter, near-neutral tint used when a real rock albedo texture is present. */
  texColor: THREE.Color;
}

const ROCK_TINT = new THREE.Color(0.72, 0.7, 0.66);

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

/** Strength of the rocky-zone attraction at a point (0..~1.2). */
function zoneBoost(x: number, z: number): number {
  let b = 0;
  for (const zone of ROCK_ZONES) {
    const d = Math.hypot(x - zone.x, z - zone.z);
    if (d < zone.r) b = Math.max(b, 1 - d / zone.r);
  }
  return b;
}

function buildPlacements(): Placement[] {
  const rng = mulberry32(0x5eed);
  const out: Placement[] = [];
  const margin = HALF - 8;
  const maxRocks = 340;
  let attempts = 0;
  while (out.length < maxRocks && attempts < 14000) {
    attempts++;
    const x = (rng() * 2 - 1) * margin;
    const z = (rng() * 2 - 1) * margin;
    const slope = getSlope01(x, z);
    const boost = zoneBoost(x, z);
    const p = Math.max(0, (slope - 0.3) * 1.4) + boost * 1.15;
    if (p <= 0.02 || rng() > p) continue;

    const dense = boost > 0.4;
    const cluster = 1 + Math.floor(rng() * (dense ? 4 : 3));
    for (let c = 0; c < cluster && out.length < maxRocks; c++) {
      const ox = x + (rng() * 2 - 1) * 3.6;
      const oz = z + (rng() * 2 - 1) * 3.6;
      // Size tier: a few big boulders, more medium rocks.
      const big = rng() < (dense ? 0.32 : 0.2);
      const base = big ? 1.8 + rng() * 2.4 : 0.55 + rng() * 1.25;
      const sx = base * (0.85 + rng() * 0.6);
      const sy = base * (0.7 + rng() * 0.5);
      const sz = base * (0.85 + rng() * 0.6);
      const y = getHeight(ox, oz) - sy * 0.42; // sunk in
      const shade = 0.3 + rng() * 0.16;
      const warm = 0.92 + rng() * 0.12;
      let color = new THREE.Color(shade * warm, shade * 0.97, shade * 0.86);
      // Sun-bleached on exposed rocky zones/outcrop; mossier and darker near the stream.
      const moist = moisture01(x, z);
      const bleach = boost * 0.18;
      const moss = moist * 0.14;
      color = new THREE.Color(
        color.r * (1 + bleach - moss * 0.5),
        color.g * (1 + bleach * 0.85 - moss * 0.15),
        color.b * (1 + bleach * 0.7 - moss * 0.25),
      );
      // Keep a little per-rock variation, but lifted so the albedo texture shows.
      const texColor = color.clone().lerp(ROCK_TINT, 0.55);
      out.push({
        variant: Math.floor(rng() * VARIANTS),
        position: [ox, y, oz],
        rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
        scale: [sx, sy, sz],
        color,
        texColor,
      });
    }
  }
  return out;
}

export default function ImprovedRocks() {
  const rockTex = useOptionalPBR('/textures/rocks/', 1.5);
  const geometries = useMemo(
    () => Array.from({ length: VARIANTS }, (_, i) => makeRockGeometry(11 + i * 37)),
    [],
  );
  const placements = useMemo(() => buildPlacements(), []);
  const byVariant = useMemo(
    () => geometries.map((_, gi) => placements.filter((p) => p.variant === gi)),
    [geometries, placements],
  );
  const flat = !rockTex?.normalMap;
  const hasAlbedo = !!(rockTex && rockTex.map);

  return (
    <group>
      {geometries.map((geo, gi) => (
        <Instances
          // Remount when textures resolve so the material compiles WITH the maps
          // (R3F does not recompile a material when its `map` prop changes post-mount).
          key={gi + (hasAlbedo ? '-tex' : '-proc')}
          geometry={geo}
          limit={Math.max(1, byVariant[gi].length)}
          castShadow
          receiveShadow
          frustumCulled={false}
        >
          <meshStandardMaterial
            roughness={0.92}
            metalness={0}
            flatShading={flat}
            map={rockTex?.map}
            normalMap={rockTex?.normalMap}
            roughnessMap={rockTex?.roughnessMap}
          />
          {byVariant[gi].map((r, i) => (
            <Instance
              key={i}
              position={r.position}
              rotation={r.rotation}
              scale={r.scale}
              color={hasAlbedo ? r.texColor : r.color}
            />
          ))}
        </Instances>
      ))}
    </group>
  );
}
