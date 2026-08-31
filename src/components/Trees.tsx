import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import { fbm } from '../utils/noise';
import {
  getHeight,
  getSlope01,
  HALF,
  ROCK_ZONES,
  distToStream,
  moisture01,
  FEATURES,
} from '../utils/terrainHeight';
import { useOptionalPBR, type PBRSet } from '../utils/useOptionalTextures';

/**
 * Dry/Mediterranean tree scatter: three low-poly species (umbrella pine,
 * scrubby oak cluster, slim cypress accent), each rendered as a
 * trunk-Instances + foliage-Instances pair. Placement follows the same
 * deterministic mulberry32 scatter pattern as ImprovedRocks/GroundDetails,
 * weighted toward the stream corridor via moisture01 and excluded from
 * steep ground, rocky zones, and the water itself.
 *
 * Foliage is built from several small noise-displaced lobes merged into one
 * compound canopy per variant (instead of one symmetric primitive), and the
 * trunk gets a root flare, faint bark ridging and baked ambient-occlusion
 * vertex colors — all one-time geometry authoring, same technique ImprovedRocks
 * uses for its boulders. Both trunk and foliage use optional local PBR
 * textures with the same neutral-tint, graceful-fallback pattern as
 * ImprovedRocks/advancedTerrainMaterial. Foliage additionally sways in the
 * wind via a shared onBeforeCompile material (same uTime/userData.shader
 * recipe as River.tsx's water shader) — the one polish cue static rocks/
 * terrain can't have.
 */

type Species = 'pine' | 'oak' | 'cypress';
const SPECIES: Species[] = ['pine', 'oak', 'cypress'];
const FOLIAGE_VARIANTS = 4;
const GOLDEN_ANGLE = 2.399963229728653; // radians, ~137.5°

interface Placement {
  species: Species;
  foliageVariant: number;
  ground: [number, number, number];
  rotationY: number;
  trunkScale: [number, number, number];
  foliageScale: [number, number, number];
  foliageY: number;
  foliageOffsetX: number;
  foliageOffsetZ: number;
  trunkColor: THREE.Color;
  foliageColor: THREE.Color;
  /** Lighter tints used when real bark/foliage albedo textures are present. */
  trunkTexColor: THREE.Color;
  foliageTexColor: THREE.Color;
}

// Near-neutral lift tints so the real albedo texture reads through the
// per-instance multiply, matching ImprovedRocks' ROCK_TINT trick.
const BARK_TINT = new THREE.Color(0.62, 0.5, 0.4);
const FOLIAGE_TINT = new THREE.Color(0.78, 0.8, 0.62);

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

/** Small deterministic offset in [-amp, amp], used to jitter lobe placement. */
function jitter(seed: number, amp: number): number {
  return (fbm(seed, seed * 1.7 + 4.1) - 0.5) * 2 * amp;
}

/** Baked ambient-occlusion + subtle warm/cool hue jitter for a foliage vertex,
 * from its own displacement value `n` (recessed = darker) plus an independent
 * higher-frequency noise sample (simulates sunlit/shaded leaf clusters). */
function foliageVertexColor(seed: number, n: number, vx: number, vz: number): [number, number, number] {
  const ao = 0.58 + 0.6 * n;
  const hueShift = (fbm(vx * 6 + seed * 3, vz * 6 - seed * 2) - 0.5) * 0.16;
  return [ao * (1 + hueShift), ao, ao * (1 - hueShift)];
}

/** Cone with the horizontal radius perturbed by fbm noise per height ring, so the
 * silhouette reads as a lumpy clump instead of a perfectly straight cone. An
 * optional sinusoidal bulge (height-correlated, not noise) can layer a multi-
 * bulge "flame" profile on top, used for the cypress spire. Bakes AO + hue-
 * jitter vertex colors from the same displacement value used for the geometry. */
function makeConeFoliageGeometry(
  radialSegments: number,
  heightSegments: number,
  seed: number,
  amplitude: number,
  bulgeAmp = 0,
  bulgeFreq = 0,
): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(1, 1, radialSegments, heightSegments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      fbm(v.x * 2.2 + seed, v.z * 2.2 - seed * 0.6) * 0.65 +
      fbm(v.y * 3 + seed * 1.3, v.x * 2 - seed) * 0.35;
    let r = 1 + (n - 0.5) * 2 * amplitude;
    if (bulgeAmp > 0) r += bulgeAmp * Math.sin(v.y * bulgeFreq * Math.PI + seed);
    pos.setXYZ(i, v.x * r, v.y, v.z * r);
    const [cr, cg, cb] = foliageVertexColor(seed, n, v.x, v.z);
    colors[i * 3] = cr;
    colors[i * 3 + 1] = cg;
    colors[i * 3 + 2] = cb;
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/** Icosahedron radially displaced by fbm noise, same technique as ImprovedRocks'
 * makeRockGeometry, for a lumpy round canopy blob. Bakes AO + hue-jitter vertex
 * colors from the same displacement value used for the geometry. */
function makeIcoFoliageGeometry(detail: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let d = fbm(v.x * 2 + seed, v.y * 2 + seed * 0.3);
    d += fbm(v.y * 2 - seed, v.z * 2 + seed * 0.7) * 0.6;
    d /= 1.6;
    const r = 0.78 + d * 0.4;
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r);
    const [cr, cg, cb] = foliageVertexColor(seed, d, v.x, v.z);
    colors[i * 3] = cr;
    colors[i * 3 + 1] = cg;
    colors[i * 3 + 2] = cb;
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

interface Lobe {
  geo: THREE.BufferGeometry;
  offset: THREE.Vector3;
  scale: number;
}

/** Merges several small lobe geometries (each already carrying position/normal/uv/color)
 * into one compound canopy, so a canopy reads as a clump of clumps instead of one
 * perfectly symmetric primitive — while still costing exactly one Instances draw call. */
function mergeLobes(lobes: Lobe[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const m = new THREE.Matrix4();
  const identityQuat = new THREE.Quaternion();

  for (const lobe of lobes) {
    const g = lobe.geo.index ? lobe.geo.toNonIndexed() : lobe.geo;
    m.compose(lobe.offset, identityQuat, new THREE.Vector3(lobe.scale, lobe.scale, lobe.scale));
    g.applyMatrix4(m);
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const c = g.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      uvs.push(uv.getX(i), uv.getY(i));
      colors.push(c.getX(i), c.getY(i), c.getZ(i));
    }
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return merged;
}

/** Two offset cone lobes (a bigger + a smaller) so a pine canopy reads as a clump
 * rather than one symmetric cone; gaps between lobes let branch structure/trunk show. */
function buildPineFoliageVariant(seed: number): THREE.BufferGeometry {
  const baseAngle = seed * 0.7;
  const lobes: Lobe[] = [0.85, 0.68].map((scale, i) => {
    const angle = baseAngle + i * GOLDEN_ANGLE;
    const radius = 0.3;
    const geo = makeConeFoliageGeometry(9, 5, seed + i * 19, 0.22);
    const offset = new THREE.Vector3(Math.cos(angle) * radius, jitter(seed + i * 7, 0.12), Math.sin(angle) * radius);
    return { geo, offset, scale };
  });
  return mergeLobes(lobes);
}

/** Three offset icosahedron lobes for a broad, dense, overlapping oak-scrub dome. */
function buildOakFoliageVariant(seed: number): THREE.BufferGeometry {
  const baseAngle = seed * 0.53;
  const lobes: Lobe[] = [0.8, 0.7, 0.62].map((scale, i) => {
    const angle = baseAngle + i * GOLDEN_ANGLE;
    const radius = 0.4;
    const geo = makeIcoFoliageGeometry(1, seed + i * 23);
    const offset = new THREE.Vector3(Math.cos(angle) * radius, jitter(seed + i * 11, 0.15), Math.sin(angle) * radius);
    return { geo, offset, scale };
  });
  return mergeLobes(lobes);
}

/** Single spire (a multi-lobe cypress would break its narrow silhouette), but with
 * a height-correlated bulge/pinch profile layered on top of the radial noise for a
 * "flame" taper instead of one smooth cone. */
function buildCypressFoliageVariant(seed: number): THREE.BufferGeometry {
  return makeConeFoliageGeometry(9, 6, seed, 0.14, 0.15, 2.5);
}

const TRUNK_SEED = 17;

/** Shared trunk geometry: root-flare "elephant foot" skirt at the base, faint
 * bark-ridge noise (so the low-poly cylinder doesn't read perfectly smooth), and
 * baked ambient-occlusion vertex colors (darker at ground contact and under the
 * canopy seam). Purely analytic (y-based) AO, not noise, so it doesn't visibly
 * repeat across the many instances sharing this one geometry. */
function makeTrunkGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(1, 1.25, 1, 10);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const flareT = THREE.MathUtils.clamp((-0.28 - v.y) / 0.22, 0, 1);
    let r = 1 + 0.5 * flareT * flareT;
    r *= 1 + (fbm(v.y * 4 + TRUNK_SEED, v.x * 3 - TRUNK_SEED) - 0.5) * 2 * 0.05;
    pos.setXYZ(i, v.x * r, v.y, v.z * r);

    const baseAO = THREE.MathUtils.smoothstep(v.y, -0.5, -0.38);
    const topAO = 1 - THREE.MathUtils.smoothstep(v.y, 0.4, 0.5);
    const ao = THREE.MathUtils.lerp(0.7, 1, baseAO) * THREE.MathUtils.lerp(0.8, 1, topAO);
    colors[i * 3] = ao;
    colors[i * 3 + 1] = ao;
    colors[i * 3 + 2] = ao;
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

const FOLIAGE_SWAY_GLSL = /* glsl */ `
#ifdef USE_INSTANCING
  float phase = instanceMatrix[3].x * 0.6 + instanceMatrix[3].z * 0.9;
  float sway = (sin(uTime * 1.3 + phase) + 0.4 * sin(uTime * 2.7 + phase * 1.7)) * uWindStrength;
  float sway2 = sin(uTime * 1.1 + phase * 1.4 + 1.7) * uWindStrength * 0.8;
  float swayC = cos(sway), swayS = sin(sway);
  transformed.xy = mat2(swayC, -swayS, swayS, swayC) * transformed.xy;
  float sway2C = cos(sway2), sway2S = sin(sway2);
  transformed.zy = mat2(sway2C, -sway2S, sway2S, sway2C) * transformed.zy;
#endif
`;

/** One shared foliage material for every species/variant Instances block (a single
 * compiled program + a single uTime uniform update drives all of them). Adds a
 * small per-tree wind sway, same onBeforeCompile + uTime/userData.shader recipe as
 * River.tsx's water shader: the injection sits right after #include <begin_vertex>,
 * before instanceMatrix is applied in #include <project_vertex>, so it rotates
 * `transformed` in pure local object-space — correctly scoped per instance with no
 * custom attributes needed (instanceMatrix's translation column is already available). */
function createFoliageMaterial(tex: PBRSet | null): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.78,
    metalness: 0,
    vertexColors: true,
    flatShading: !tex?.normalMap,
  });
  if (tex) {
    if (tex.map) material.map = tex.map;
    if (tex.normalMap) {
      material.normalMap = tex.normalMap;
      material.normalScale = new THREE.Vector2(0.55, 0.6);
    }
    if (tex.roughnessMap) material.roughnessMap = tex.roughnessMap;
  }

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWindStrength = { value: 0.045 };
    material.userData.shader = shader;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'uniform float uTime;\nuniform float uWindStrength;\n#include <common>')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${FOLIAGE_SWAY_GLSL}`);
  };
  material.customProgramCacheKey = () => 'tree-foliage-sway-v1';
  return material;
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
    if (h < -30 || h > 30) continue; // stay in the grassy/earth elevation band (widened to include the valley floor)

    const density = 0.16 + moist * 0.55; // denser riparian clustering near the stream
    if (rng() > density) continue;

    const roll = rng();
    const species: Species =
      moist > 0.35 ? (roll < 0.7 ? 'oak' : 'pine') : roll < 0.55 ? 'pine' : roll < 0.85 ? 'oak' : 'cypress';

    // Mostly-raised size floor with a sparse "hero tree" tail for skyline variety,
    // instead of a narrow uniform band that reads as copy-pasted clip art.
    const hero = rng() < 0.1;
    const base = hero ? 1.55 + rng() * 0.55 : 1.05 + rng() * 0.55;

    const trunkH = base * (species === 'cypress' ? 4.0 : species === 'oak' ? 2.4 : 3.2);
    const trunkR = base * (species === 'oak' ? 0.185 : 0.13);
    const foliageR =
      species === 'pine'
        ? base * (1.05 + rng() * 0.35)
        : species === 'oak'
          ? base * (0.95 + rng() * 0.35)
          : base * (0.55 + rng() * 0.2);
    const foliageH = species === 'pine' ? base * 1.3 : species === 'oak' ? base * 1.6 : base * 3.3;
    // Canopy anchored at/above the trunk top (not swallowing its upper third) so a
    // taller trunk actually reads as taller. Cypress specifically: canopy centered
    // higher up a taller spire, with foliageH raised in lockstep, so the cone tip
    // reliably clears the trunk top (~7-8% margin, stable across the whole `base`
    // range) instead of the bare trunk poking above a too-short canopy.
    const foliageY = species === 'cypress' ? trunkH * 0.66 : species === 'oak' ? trunkH * 0.97 : trunkH * 1.0;

    // Off-axis canopy jitter (skip cypress to keep its narrow spire silhouette) so
    // the canopy isn't perfectly coaxial with the trunk — breaks the "blob glued to
    // a stick" look with two extra numbers.
    const foliageOffsetX = species === 'cypress' ? 0 : (rng() * 2 - 1) * 0.12 * foliageR;
    const foliageOffsetZ = species === 'cypress' ? 0 : (rng() * 2 - 1) * 0.12 * foliageR;

    // Sun-bleached bark/foliage near exposed rocky zones; darker and mossier near the stream.
    const bleach = boost * 0.16;
    const moss = moist * 0.12;

    const shade = 0.32 + rng() * 0.14;
    const trunkColor = new THREE.Color(
      shade * 0.9 * (1 + bleach - moss * 0.5),
      shade * 0.72 * (1 + bleach * 0.85 - moss * 0.3),
      shade * 0.56 * (1 + bleach * 0.7 - moss * 0.15),
    );
    const g = 0.34 + rng() * 0.12 - moist * 0.05;
    const foliageColor = new THREE.Color(
      g * 0.85 * (1 + bleach * 0.6 - moss * 0.2),
      g * (1 + bleach * 0.4 + moss * 0.2),
      g * 0.55 * (1 + bleach * 0.3 - moss * 0.35),
    );

    out.push({
      species,
      foliageVariant: Math.floor(rng() * FOLIAGE_VARIANTS),
      ground: [x, h, z],
      rotationY: rng() * Math.PI * 2,
      trunkScale: [trunkR, trunkH, trunkR],
      foliageScale: [foliageR, foliageH, foliageR],
      foliageY,
      foliageOffsetX,
      foliageOffsetZ,
      trunkColor,
      foliageColor,
      trunkTexColor: trunkColor.clone().lerp(BARK_TINT, 0.5),
      foliageTexColor: foliageColor.clone().lerp(FOLIAGE_TINT, 0.55),
    });
  }

  clearValleyMarker(out);

  return out;
}

/** The "valley" concept marker's annotation ring (radius ~11, see TerrainMarker)
 * shouldn't have a tree standing in it. The pine that used to sit right on the
 * marker is dropped outright; any other tree still inside the ring gets pushed
 * radially out past its edge instead — a tree centered on the ring reads as if
 * the tree itself were the marker, which relocating (not deleting) fixes. */
function clearValleyMarker(out: Placement[]): void {
  const { x: vx, z: vz } = FEATURES.valley;
  const RING_CLEAR = 13;

  let blockerIdx = -1;
  let blockerDist = Infinity;
  out.forEach((p, i) => {
    if (p.species !== 'pine') return;
    const d = Math.hypot(p.ground[0] - vx, p.ground[2] - vz);
    if (d < blockerDist) {
      blockerDist = d;
      blockerIdx = i;
    }
  });
  if (blockerIdx !== -1 && blockerDist <= RING_CLEAR) out.splice(blockerIdx, 1);

  out.forEach((p, i) => {
    const dx = p.ground[0] - vx;
    const dz = p.ground[2] - vz;
    const d = Math.hypot(dx, dz);
    if (d >= RING_CLEAR || d < 0.01) return;
    const angle = Math.atan2(dz, dx);
    const newX = vx + Math.cos(angle) * (RING_CLEAR + 4);
    const newZ = vz + Math.sin(angle) * (RING_CLEAR + 4);
    out[i] = { ...p, ground: [newX, getHeight(newX, newZ), newZ] };
  });
}

export default function Trees() {
  const barkTex = useOptionalPBR('/textures/bark/', 2);
  const foliageTex = useOptionalPBR('/textures/foliage/', 2.5);
  const barkFlat = !barkTex?.normalMap;
  const hasBarkAlbedo = !!(barkTex && barkTex.map);
  const hasFoliageAlbedo = !!(foliageTex && foliageTex.map);

  const placements = useMemo(() => buildPlacements(), []);
  const bySpecies = useMemo(() => {
    const map: Record<Species, Placement[]> = { pine: [], oak: [], cypress: [] };
    for (const p of placements) map[p.species].push(p);
    return map;
  }, [placements]);

  const trunkGeo = useMemo(() => makeTrunkGeometry(), []);

  // A handful of compound (multi-lobe), noise-displaced foliage geometries per
  // species so canopies vary instance-to-instance instead of every tree sharing
  // one identical, perfectly-symmetric primitive.
  const foliageGeos = useMemo(() => {
    const result: Record<Species, THREE.BufferGeometry[]> = { pine: [], oak: [], cypress: [] };
    for (let i = 0; i < FOLIAGE_VARIANTS; i++) {
      result.pine.push(buildPineFoliageVariant(5 + i * 31));
      result.oak.push(buildOakFoliageVariant(41 + i * 23));
      result.cypress.push(buildCypressFoliageVariant(71 + i * 13));
    }
    return result;
  }, []);

  // Recreated (not mutated) whenever the texture set resolves, since a material's
  // map/normalMap don't trigger a shader recompile if set after the fact — same
  // gotcha this file already works around for the trunk/rock materials.
  // Keyed on presence, not identity: foliageTex only ever transitions null -> one
  // stable PBRSet object, so hasFoliageAlbedo alone is the correct dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const foliageMaterial = useMemo(() => createFoliageMaterial(foliageTex), [hasFoliageAlbedo]);

  useFrame((state) => {
    const shader = foliageMaterial.userData.shader as
      | { uniforms: { uTime: { value: number } } }
      | undefined;
    // eslint-disable-next-line react-hooks/immutability
    if (shader) shader.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group>
      {SPECIES.map((sp) => {
        const items = bySpecies[sp];
        const byVariant = Array.from({ length: FOLIAGE_VARIANTS }, (_, vi) =>
          items.filter((t) => t.foliageVariant === vi),
        );
        return (
          <group key={sp}>
            <Instances
              key={hasBarkAlbedo ? 'trunk-tex' : 'trunk-proc'}
              geometry={trunkGeo}
              limit={Math.max(1, items.length)}
              castShadow
              receiveShadow
              frustumCulled={false}
            >
              <meshStandardMaterial
                vertexColors
                roughness={0.82}
                metalness={0}
                flatShading={barkFlat}
                map={barkTex?.map}
                normalMap={barkTex?.normalMap}
                normalScale={[1.1, 1.1]}
                roughnessMap={barkTex?.roughnessMap}
              />
              {items.map((t, i) => (
                <Instance
                  key={i}
                  position={[
                    t.ground[0],
                    t.ground[1] + t.trunkScale[1] / 2 - t.trunkScale[0] * 0.28,
                    t.ground[2],
                  ]}
                  rotation={[0, t.rotationY, 0]}
                  scale={t.trunkScale}
                  color={hasBarkAlbedo ? t.trunkTexColor : t.trunkColor}
                />
              ))}
            </Instances>
            {foliageGeos[sp].map((geo, vi) => (
              <Instances
                key={vi}
                geometry={geo}
                limit={Math.max(1, byVariant[vi].length)}
                castShadow
                receiveShadow
                frustumCulled={false}
              >
                <primitive object={foliageMaterial} attach="material" />
                {byVariant[vi].map((t, i) => (
                  <Instance
                    key={i}
                    position={[
                      t.ground[0] + t.foliageOffsetX,
                      t.ground[1] + t.foliageY,
                      t.ground[2] + t.foliageOffsetZ,
                    ]}
                    rotation={[0, t.rotationY, 0]}
                    scale={t.foliageScale}
                    color={hasFoliageAlbedo ? t.foliageTexColor : t.foliageColor}
                  />
                ))}
              </Instances>
            ))}
          </group>
        );
      })}
    </group>
  );
}
