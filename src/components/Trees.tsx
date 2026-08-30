import { useMemo } from 'react';
import * as THREE from 'three';
import { Instances, Instance } from '@react-three/drei';
import {
  getHeight,
  getSlope01,
  HALF,
  ROCK_ZONES,
  distToStream,
  moisture01,
} from '../utils/terrainHeight';

/**
 * Dry/Mediterranean tree scatter: three low-poly species (umbrella pine,
 * scrubby oak cluster, slim cypress accent), each rendered as a
 * trunk-Instances + foliage-Instances pair. Placement follows the same
 * deterministic mulberry32 scatter pattern as ImprovedRocks/GroundDetails,
 * weighted toward the stream corridor via moisture01 and excluded from
 * steep ground, rocky zones, and the water itself.
 */

type Species = 'pine' | 'oak' | 'cypress';
const SPECIES: Species[] = ['pine', 'oak', 'cypress'];

interface Placement {
  species: Species;
  ground: [number, number, number];
  rotationY: number;
  trunkScale: [number, number, number];
  foliageScale: [number, number, number];
  foliageY: number;
  trunkColor: THREE.Color;
  foliageColor: THREE.Color;
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

function buildPlacements(): Placement[] {
  const rng = mulberry32(0x7ee5);
  const out: Placement[] = [];
  const margin = HALF - 10;
  const maxTrees = 130;
  let attempts = 0;

  while (out.length < maxTrees && attempts < 20000) {
    attempts++;
    const x = (rng() * 2 - 1) * margin;
    const z = (rng() * 2 - 1) * margin;
    const h = getHeight(x, z);
    const slope = getSlope01(x, z);
    const boost = zoneBoost(x, z);
    const moist = moisture01(x, z);

    if (distToStream(x, z) < 3.2) continue; // not in the water
    if (slope > 0.35 || boost > 0.3) continue; // not on steep faces or rocky zones
    if (h < -4 || h > 30) continue; // stay in the grassy/earth elevation band

    const density = 0.16 + moist * 0.55; // denser riparian clustering near the stream
    if (rng() > density) continue;

    const roll = rng();
    const species: Species =
      moist > 0.35 ? (roll < 0.7 ? 'oak' : 'pine') : roll < 0.55 ? 'pine' : roll < 0.85 ? 'oak' : 'cypress';

    const base = 0.75 + rng() * 0.7;
    const trunkH = base * (species === 'cypress' ? 2.6 : 1.4);
    const trunkR = base * (species === 'oak' ? 0.16 : 0.11);
    const foliageR =
      species === 'pine'
        ? base * (1.6 + rng() * 0.5)
        : species === 'oak'
          ? base * (1.1 + rng() * 0.4)
          : base * (0.55 + rng() * 0.2);
    const foliageH = species === 'pine' ? base * 0.9 : species === 'oak' ? base * 1.4 : base * 2.6;
    const foliageY = species === 'cypress' ? trunkH * 0.55 : trunkH * 0.85;

    const shade = 0.32 + rng() * 0.14;
    const trunkColor = new THREE.Color(shade * 0.9, shade * 0.72, shade * 0.56);
    const g = 0.34 + rng() * 0.12 - moist * 0.05;
    const foliageColor = new THREE.Color(g * 0.85, g, g * 0.55);

    out.push({
      species,
      ground: [x, h, z],
      rotationY: rng() * Math.PI * 2,
      trunkScale: [trunkR, trunkH, trunkR],
      foliageScale: [foliageR, foliageH, foliageR],
      foliageY,
      trunkColor,
      foliageColor,
    });
  }
  return out;
}

export default function Trees() {
  const placements = useMemo(() => buildPlacements(), []);
  const bySpecies = useMemo(() => {
    const map: Record<Species, Placement[]> = { pine: [], oak: [], cypress: [] };
    for (const p of placements) map[p.species].push(p);
    return map;
  }, [placements]);

  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(1, 1.25, 1, 6), []);
  const pineFoliageGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 8), []);
  const oakFoliageGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const cypressFoliageGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 7), []);
  const foliageGeo: Record<Species, THREE.BufferGeometry> = {
    pine: pineFoliageGeo,
    oak: oakFoliageGeo,
    cypress: cypressFoliageGeo,
  };

  return (
    <group>
      {SPECIES.map((sp) => {
        const items = bySpecies[sp];
        return (
          <group key={sp}>
            <Instances
              geometry={trunkGeo}
              limit={Math.max(1, items.length)}
              castShadow
              receiveShadow
              frustumCulled={false}
            >
              <meshStandardMaterial roughness={0.9} metalness={0} />
              {items.map((t, i) => (
                <Instance
                  key={i}
                  position={[t.ground[0], t.ground[1] + t.trunkScale[1] / 2, t.ground[2]]}
                  rotation={[0, t.rotationY, 0]}
                  scale={t.trunkScale}
                  color={t.trunkColor}
                />
              ))}
            </Instances>
            <Instances
              geometry={foliageGeo[sp]}
              limit={Math.max(1, items.length)}
              castShadow
              receiveShadow
              frustumCulled={false}
            >
              <meshStandardMaterial roughness={0.85} metalness={0} flatShading />
              {items.map((t, i) => (
                <Instance
                  key={i}
                  position={[t.ground[0], t.ground[1] + t.foliageY, t.ground[2]]}
                  rotation={[0, t.rotationY, 0]}
                  scale={t.foliageScale}
                  color={t.foliageColor}
                />
              ))}
            </Instances>
          </group>
        );
      })}
    </group>
  );
}
