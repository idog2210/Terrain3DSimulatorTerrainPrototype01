# Terrain Realism (River, Trees, Material Variety) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real river in place of the dry stream, add dry-climate trees, and break up the repetitive/"copy-pasted" look of the ground and rocks — all driven by one new shared `moisture01` field so the additions read as one coherent landscape.

**Architecture:** `terrainHeight.ts` gains a `moisture01(x,z)` helper (falloff from the existing stream path) alongside the already-exported `getHeight`. Every new/changed system — the water mesh, tree placement, rock/pebble/grass tint, and the terrain's biome coloring — reads from this one field, the same way everything already reads `getHeight`. Two new scene components (`River.tsx`, `Trees.tsx`) follow the existing `Instances`/mulberry32 scatter pattern from `ImprovedRocks.tsx`. The terrain albedo's visible tiling is fixed with a stochastic dual-sample blend in the existing `onBeforeCompile` shader.

**Tech Stack:** React 19, `@react-three/fiber` 9 / `@react-three/drei` 10, `three` 0.184 (raw `BufferGeometry`, `MeshStandardMaterial.onBeforeCompile` GLSL chunk patching — no new dependencies).

**Spec:** `docs/superpowers/specs/2026-08-30-terrain-realism-design.md`

## Global Constraints

- Terrain shape/collision is driven exclusively by `getHeight(x,z)` in `src/utils/terrainHeight.ts` — do not duplicate height logic elsewhere; sample it.
- Scatter components use the deterministic `mulberry32(seed)` PRNG already defined in `ImprovedRocks.tsx`/`GroundDetails.tsx` (copy the function, do not import across component files — that is the existing project convention, each scatter component owns its own copy).
- Colors authored as `THREE.Color` in linear space via vertex-color/instance-color, matching the existing convention in `ProceduralTerrain.tsx`/`ImprovedRocks.tsx`.
- No new npm dependencies.
- There is no automated test suite for terrain/visual output in this project (procedural GLSL/geometry, verified visually — this is an existing project convention, not a gap introduced by this plan). Each task's verification is: `npm run build` (runs `tsc -b`) and `npm run lint` both passing, plus a manual check in the running dev server (`npm run dev`) as described in that task's steps.
- **Known pre-existing baseline breakage (unrelated WIP already on `main`, ruled out of scope by the project owner):** `npm run build` currently fails with 3 TypeScript errors in `src/components/HudPanel.tsx` (missing `UIStrings` keys `hudEmpty`/`hudEyebrow`/`hudMeaning` — mid-edit work on an unrelated azimuth/range feature tracked in `fixes30082026.md`). `npm run lint` currently fails with pre-existing errors in `FirstPersonController.tsx` (unrelated, part of the same WIP) — do not fix these. Verification in this plan means: no *new* `tsc`/lint errors are introduced by this task's own files, and none of these specific pre-existing errors get worse. Do not "fix" `HudPanel.tsx`/`i18n.ts`/`FirstPersonController.tsx` as part of any task in this plan — that file is mid-edit by the project owner outside this plan's scope.
- `npm run lint` also currently fails on two pre-existing errors inside files this plan already touches: `ImprovedRocks.tsx:120` and `GroundDetails.tsx:105` both call `useMemo(fnRef, [])` with a non-inline function reference (violates this project's `react-hooks` lint config), and `ImprovedRocks.tsx:81` has a `let p` that is never reassigned (violates `prefer-const`). Tasks 5 and 6 include one-line drive-by fixes for these three, since they sit in files those tasks already modify — no other pre-existing lint/build errors are in scope.

---

## Task 1: Export `distToStream`/`STREAM_PATH`, add `moisture01`, fold into `terrainColor`

**Files:**
- Modify: `src/utils/terrainHeight.ts:34-51` (composition anchors), `:105-114` (`distToStream`), `:238-281` (palette/`terrainColor`)
- Modify: `src/components/ProceduralTerrain.tsx:58`
- Modify: `src/components/MiniMap.tsx:55`

**Interfaces:**
- Produces: `export const STREAM_PATH: ReadonlyArray<readonly [number, number]>` (already exists as a private const — just add `export`)
- Produces: `export function distToStream(x: number, z: number): number` (already exists as a private function — just add `export`)
- Produces: `export function moisture01(x: number, z: number): number` — returns a value in `[0,1]`, 1 at the stream centerline, falling off with distance
- Produces: `export function terrainColor(height: number, slope01: number, tint?: number, moisture?: number): RGB` — new optional 4th parameter, defaults to `0` so existing callers that don't pass it are unaffected

- [ ] **Step 1: Export `STREAM_PATH` and `distToStream`**

In `src/utils/terrainHeight.ts`, change:

```ts
const STREAM_PATH: ReadonlyArray<readonly [number, number]> = [
```

to:

```ts
export const STREAM_PATH: ReadonlyArray<readonly [number, number]> = [
```

and change:

```ts
function distToStream(x: number, z: number): number {
```

to:

```ts
export function distToStream(x: number, z: number): number {
```

- [ ] **Step 2: Add `moisture01`**

In `src/utils/terrainHeight.ts`, directly below the existing `streamCarve` function (around line 122), add:

```ts
/**
 * Proxy for ground moisture in [0,1]: 1 at the stream centerline, falling
 * off smoothly with distance. Shared driver for river placement, tree
 * density, and the biome tint in `terrainColor` — everything that should
 * read as "closer to water" uses this one field.
 */
export function moisture01(x: number, z: number): number {
  const d = distToStream(x, z);
  const w = 14;
  return Math.exp(-(d * d) / (2 * w * w));
}
```

- [ ] **Step 3: Fold moisture into `terrainColor`**

In `src/utils/terrainHeight.ts`, add a new palette entry to the `PALETTE` object (around line 238):

```ts
const PALETTE = {
  channel: { r: 0.36, g: 0.33, b: 0.28 }, // damp drainage soil (visibly lit, never black)
  lowEarth: { r: 0.46, g: 0.4, b: 0.3 }, // alluvial soil in the low ground
  dryGrass: { r: 0.49, g: 0.52, b: 0.33 }, // muted olive dry grass
  earth: { r: 0.48, g: 0.4, b: 0.27 }, // warm tan upland earth
  rock: { r: 0.43, g: 0.43, b: 0.42 }, // neutral muted grey rock
  highRock: { r: 0.6, g: 0.59, b: 0.57 }, // sun-bleached high rock
  riparian: { r: 0.28, g: 0.36, b: 0.22 }, // lush damp ground near the stream
} as const;
```

Then change the `terrainColor` signature and body (around line 261):

```ts
export function terrainColor(
  height: number,
  slope01: number,
  tint = 0.5,
  moisture = 0,
): RGB {
  const h = height + (tint - 0.5) * 9;
  let c: RGB;
  if (h < -6) {
    c = mix(PALETTE.channel, PALETTE.lowEarth, smoothstep(-18, -6, h));
  } else if (h < 8) {
    c = mix(PALETTE.lowEarth, PALETTE.dryGrass, smoothstep(-6, 8, h));
  } else if (h < 26) {
    c = mix(PALETTE.dryGrass, PALETTE.earth, smoothstep(8, 26, h));
  } else {
    c = mix(PALETTE.earth, PALETTE.highRock, smoothstep(26, 58, h));
  }
  const v = 0.93 + tint * 0.14;
  c = { r: c.r * v, g: c.g * v, b: c.b * v };
  // Riparian moisture tint: greener, damper ground near the stream.
  c = mix(c, PALETTE.riparian, moisture * 0.32);
  // Steep ground exposes rock.
  const rockBlend = smoothstep(0.4, 0.7, slope01);
  c = mix(c, PALETTE.rock, rockBlend * 0.9);
  // Bare rock dominates the very high crest.
  c = mix(c, PALETTE.rock, smoothstep(44, 60, height) * 0.4);
  return c;
}
```

- [ ] **Step 4: Pass moisture at both `terrainColor` call sites**

In `src/components/ProceduralTerrain.tsx`, update the import (line 3-10 area) to also bring in `moisture01`, and change line 58 from:

```ts
      const cn = terrainColor(y, slope01, colorTint(pos.getX(i), pos.getZ(i)));
```

to:

```ts
      const cn = terrainColor(
        y,
        slope01,
        colorTint(pos.getX(i), pos.getZ(i)),
        moisture01(pos.getX(i), pos.getZ(i)),
      );
```

In `src/components/MiniMap.tsx`, update the import (line 2-10 area) to also bring in `moisture01`, and change line 55 from:

```ts
      const c = terrainColor(h, slope01, colorTint(x, z));
```

to:

```ts
      const c = terrainColor(h, slope01, colorTint(x, z), moisture01(x, z));
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: succeeds with no TypeScript errors (confirms the new export names and the 4-argument `terrainColor` call sites type-check).

Run: `npm run lint`
Expected: no new lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/utils/terrainHeight.ts src/components/ProceduralTerrain.tsx src/components/MiniMap.tsx
git commit -m "Add moisture01 field and fold it into terrainColor biome tint"
```

---

## Task 2: Break up visible terrain texture tiling

**Files:**
- Modify: `src/utils/advancedTerrainMaterial.ts`

**Interfaces:**
- Consumes: nothing new (uses the existing `tFbm` GLSL function and `vWPos` varying already declared in this file)
- Produces: no exported signature change — `createAdvancedTerrainMaterial(tex: PBRSet | null): THREE.MeshStandardMaterial` keeps the same signature

- [ ] **Step 1: Add the stochastic-tiling GLSL block**

In `src/utils/advancedTerrainMaterial.ts`, add a new block constant below `ROUGH_BLOCK` (around line 54):

```ts
const MAP_BREAKUP = /* glsl */ `
#ifdef USE_MAP
  vec2 uvA = vMapUv;
  float mrot = 2.4;
  float mcos = cos(mrot);
  float msin = sin(mrot);
  vec2 mcentered = uvA - 0.5;
  vec2 uvB = vec2(
    mcentered.x * mcos - mcentered.y * msin,
    mcentered.x * msin + mcentered.y * mcos
  ) + 0.5 + vec2(37.2, 11.7);
  vec4 sampledDiffuseColorA = texture2D( map, uvA );
  vec4 sampledDiffuseColorB = texture2D( map, uvB );
  float blendN = tFbm(vWPos.xz * 0.015 + 100.0);
  vec4 sampledDiffuseColor = mix(sampledDiffuseColorA, sampledDiffuseColorB, smoothstep(0.35, 0.65, blendN));
  diffuseColor *= sampledDiffuseColor;
#endif
`;
```

This samples the (already-tiling) albedo texture a second time at a rotated and offset UV, and blends between the two samples using the same low-frequency `tFbm` noise already used elsewhere in this shader — breaking up the visible repeat grid without a new texture asset. It replaces three's default `#include <map_fragment>` body, which is a no-op when `USE_MAP` is undefined (no texture loaded yet), so it is safe to always inject.

- [ ] **Step 2: Wire the block into the fragment shader**

In the same file, in the `material.onBeforeCompile` assignment, add one more `.replace(...)` to the `shader.fragmentShader` chain (around line 84-90):

```ts
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', NOISE_GLSL + VARYINGS + '#include <common>')
      .replace('#include <map_fragment>', MAP_BREAKUP)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + COLOR_BLOCK)
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\n' + ROUGH_BLOCK,
      );
```

- [ ] **Step 3: Bump the program cache key**

The material's `customProgramCacheKey` (around line 93) must change since the compiled shader source changed:

```ts
  material.customProgramCacheKey = () => 'advanced-terrain-v3';
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

Run: `npm run dev`, open the app in a browser, and visually confirm:
- if `public/textures/terrain/albedo.jpg` is present, the ground no longer shows an obvious repeating tile pattern when viewed from a distance (e.g. from the guided/demo camera looking down the valley);
- no WebGL shader compile errors appear in the browser console.

Stop the dev server after checking.

- [ ] **Step 5: Commit**

```bash
git add src/utils/advancedTerrainMaterial.ts
git commit -m "Break up visible terrain albedo tiling with a stochastic dual-sample blend"
```

---

## Task 3: River water component

**Files:**
- Create: `src/components/River.tsx`
- Modify: `src/components/TerrainScene.tsx`

**Interfaces:**
- Consumes: `STREAM_PATH`, `getHeight` from `src/utils/terrainHeight.ts` (Task 1)
- Produces: `export default function River(): JSX.Element` — a self-contained scene component, no props

- [ ] **Step 1: Create the river geometry + water material + component**

Create `src/components/River.tsx`:

```tsx
import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { STREAM_PATH, getHeight } from '../utils/terrainHeight';

/**
 * The river: a ribbon mesh following STREAM_PATH, sampling terrain height
 * along its centerline (which already includes the dry-stream carve) so the
 * water surface sits inside the existing channel. Width tapers in/out at
 * the path ends. A lightweight animated-ripple water shader (same
 * onBeforeCompile technique as advancedTerrainMaterial.ts) gives it motion
 * and a Fresnel-ish deep/shallow color gradient across the width.
 */

const SEGMENTS_PER_SPAN = 14;
const BASE_WIDTH = 3.4;

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function buildRiverGeometry(): THREE.BufferGeometry {
  const controlPoints = STREAM_PATH.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.4);
  const steps = (STREAM_PATH.length - 1) * SEGMENTS_PER_SPAN;

  const centers: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = curve.getPoint(i / steps);
    p.y = getHeight(p.x, p.z) + 0.08;
    centers.push(p);
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = centers[i];
    const prev = centers[Math.max(0, i - 1)];
    const next = centers[Math.min(steps, i + 1)];
    const tangent = new THREE.Vector3().subVectors(next, prev);
    tangent.y = 0;
    if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
    tangent.normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

    const taper = smoothstep01(0, 0.06, t) * (1 - smoothstep01(0.94, 1, t));
    const halfWidth = (BASE_WIDTH * 0.5) * Math.max(0.05, taper);

    const left = p.clone().addScaledVector(normal, halfWidth);
    const right = p.clone().addScaledVector(normal, -halfWidth);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(0, t * steps * 0.35, 1, t * steps * 0.35);

    if (i > 0) {
      const a = (i - 1) * 2;
      const b = i * 2;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aRiverUv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const WATER_NOISE_GLSL = /* glsl */ `
float wHash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float wNoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = wHash(i), b = wHash(i + vec2(1.0, 0.0));
  float c = wHash(i + vec2(0.0, 1.0)), d = wHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`;

function createWaterMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.05, 0.16, 0.19),
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    material.userData.shader = shader;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'attribute vec2 aRiverUv;\nvarying vec2 vWaterUv;\n#include <common>')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWaterUv = aRiverUv;');

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `varying vec2 vWaterUv;\nuniform float uTime;\n${WATER_NOISE_GLSL}\n#include <common>`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  float rip = wNoise(vWaterUv * vec2(3.0, 26.0) + vec2(uTime * 0.12, uTime * 0.55));
  float rip2 = wNoise(vWaterUv * vec2(5.0, 14.0) - vec2(uTime * 0.08, uTime * 0.4));
  normal.xz += (vec2(rip, rip2) - 0.5) * 0.12;
  normal = normalize(normal);
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float edge = abs(vWaterUv.x - 0.5) * 2.0;
  vec3 deep = vec3(0.03, 0.13, 0.16);
  vec3 shallow = vec3(0.22, 0.4, 0.38);
  diffuseColor.rgb = mix(deep, shallow, clamp(edge * 1.3, 0.0, 1.0));
  diffuseColor.a = mix(0.92, 0.35, clamp(edge * 1.6, 0.0, 1.0));
}`,
      );
  };

  material.customProgramCacheKey = () => 'river-water-v1';
  return material;
}

export default function River() {
  const geometry = useMemo(() => buildRiverGeometry(), []);
  const material = useMemo(() => createWaterMaterial(), []);

  useFrame((state) => {
    const shader = material.userData.shader as
      | { uniforms: { uTime: { value: number } } }
      | undefined;
    if (shader) shader.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh geometry={geometry} receiveShadow frustumCulled={false}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}
```

- [ ] **Step 2: Wire `River` into the scene**

In `src/components/TerrainScene.tsx`, add the import near the other component imports:

```tsx
import River from './River';
```

And render it after `GroundDetails`:

```tsx
      <ProceduralTerrain />
      <ImprovedRocks />
      <GroundDetails />
      <River />
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

Run: `npm run dev`, open the app, enter free-roam mode, and walk to the stream (the leading channel visible from the spawn point, running roughly north from around `x=8, z=18` per `FEATURES.stream` in `terrainHeight.ts`). Confirm:
- a blue-green ribbon of water is visible inside the carved channel, tapering in/out at its ends, with no gaps or floating above the terrain;
- the water surface has a subtle animated ripple (watch for a few seconds);
- no WebGL/shader console errors.

Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add src/components/River.tsx src/components/TerrainScene.tsx
git commit -m "Add animated river water mesh following the stream channel"
```

---

## Task 4: Trees

**Files:**
- Create: `src/components/Trees.tsx`
- Modify: `src/components/TerrainScene.tsx`

**Interfaces:**
- Consumes: `getHeight`, `getSlope01`, `HALF`, `ROCK_ZONES`, `distToStream`, `moisture01` from `src/utils/terrainHeight.ts` (Task 1)
- Produces: `export default function Trees(): JSX.Element` — a self-contained scene component, no props

- [ ] **Step 1: Create the tree scatter component**

Create `src/components/Trees.tsx`:

```tsx
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
```

- [ ] **Step 2: Wire `Trees` into the scene**

In `src/components/TerrainScene.tsx`, add the import near the other component imports:

```tsx
import Trees from './Trees';
```

And render it after `River`:

```tsx
      <ProceduralTerrain />
      <ImprovedRocks />
      <GroundDetails />
      <River />
      <Trees />
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

Run: `npm run dev`, open the app, enter free-roam mode, and check:
- trees are visible scattered across the grassy mid/low ground, denser near the stream, absent from the steep ridge faces, the rocky outcrop, and directly on the water;
- no tree floats above the ground or is buried in it (walk close to a few and look at the trunk base);
- no WebGL/console errors; frame rate stays smooth while walking (roughly unchanged from before this task).

Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add src/components/Trees.tsx src/components/TerrainScene.tsx
git commit -m "Add dry-climate tree scatter (pine/oak/cypress) driven by moisture and slope"
```

---

## Task 5: Rock zone-tint drift

**Files:**
- Modify: `src/components/ImprovedRocks.tsx`

**Interfaces:**
- Consumes: `moisture01` from `src/utils/terrainHeight.ts` (Task 1), reuses the already-present `boost` (from `zoneBoost`) local variable
- Produces: no exported signature change

- [ ] **Step 1: Import `moisture01`**

In `src/components/ImprovedRocks.tsx`, update the import from `terrainHeight` (line 5):

```ts
import { getHeight, getSlope01, HALF, ROCK_ZONES, moisture01 } from '../utils/terrainHeight';
```

- [ ] **Step 2: Drive-by fix — two pre-existing lint errors in this file**

`npm run lint` currently reports two pre-existing errors in this file (unrelated to this task, but cheap to fix since Step 3 already edits this same function). In `buildPlacements()`, change:

```ts
    let p = Math.max(0, (slope - 0.3) * 1.4) + boost * 1.15;
```

to:

```ts
    const p = Math.max(0, (slope - 0.3) * 1.4) + boost * 1.15;
```

(it is never reassigned — this fixes a `prefer-const` lint error). Then, near the bottom of the component, change:

```ts
  const placements = useMemo(buildPlacements, []);
```

to:

```ts
  const placements = useMemo(() => buildPlacements(), []);
```

(this fixes a `react-hooks` lint error requiring an inline function expression as the first argument to `useMemo`).

- [ ] **Step 3: Add the zone-tint drift**

In `buildPlacements()` (around line 96-100), replace:

```ts
      const shade = 0.3 + rng() * 0.16;
      const warm = 0.92 + rng() * 0.12;
      const color = new THREE.Color(shade * warm, shade * 0.97, shade * 0.86);
      // Keep a little per-rock variation, but lifted so the albedo texture shows.
      const texColor = color.clone().lerp(ROCK_TINT, 0.55);
```

with:

```ts
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
```

(`boost` and `x`/`z` are already in scope in this function — `boost` is computed a few lines above as `const boost = zoneBoost(x, z);`.)

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

Run: `npm run lint`
Expected: no lint errors in `src/components/ImprovedRocks.tsx` (the two pre-existing errors from Step 2 are now fixed; no new errors introduced).

Run: `npm run dev`, open the app, and visually compare rocks near the outcrop/ridge zones (should look slightly warmer/lighter) versus rocks near the stream (should look slightly darker/mossier) versus the previous uniform look.

Stop the dev server after checking.

- [ ] **Step 5: Commit**

```bash
git add src/components/ImprovedRocks.tsx
git commit -m "Add moisture/zone-based tint drift to rock scatter; fix pre-existing lint errors in this file"
```

---

## Task 6: Ground scatter (pebbles/grass) zone-tint drift

**Files:**
- Modify: `src/components/GroundDetails.tsx`

**Interfaces:**
- Consumes: `moisture01` from `src/utils/terrainHeight.ts` (Task 1)
- Produces: no exported signature change

- [ ] **Step 1: Import `moisture01`**

In `src/components/GroundDetails.tsx`, update the import from `terrainHeight` (line 4):

```ts
import { getHeight, getSlope01, HALF, ROCK_ZONES, moisture01 } from '../utils/terrainHeight';
```

- [ ] **Step 2: Drive-by fix — pre-existing lint error in this file**

`npm run lint` currently reports one pre-existing error in this file (unrelated to this task, but cheap to fix since this task already edits this same component). Near the bottom of the component, change:

```ts
  const { pebbles, blades, debris } = useMemo(build, []);
```

to:

```ts
  const { pebbles, blades, debris } = useMemo(() => build(), []);
```

(this fixes a `react-hooks` lint error requiring an inline function expression as the first argument to `useMemo`).

- [ ] **Step 3: Tint pebbles by moisture**

In `build()`, in the pebbles block (around line 61-70), replace:

```ts
    // Pebbles: broad, denser near rocky zones.
    if (pebbles.length < 420 && slope < 0.6 && rng() < 0.4 + boost * 0.5) {
      const s = 0.1 + rng() * 0.24;
      const sh = 0.26 + rng() * 0.14;
      pebbles.push({
        position: [x, h - s * 0.4, z],
        rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
        scale: [s * (0.8 + rng() * 0.5), s * (0.6 + rng() * 0.4), s * (0.8 + rng() * 0.5)],
        color: new THREE.Color(sh, sh * 0.96, sh * 0.88),
      });
    }
```

with:

```ts
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
```

- [ ] **Step 4: Tint grass blades by moisture**

In the same function, in the dry-grass tufts block (around line 73-87), replace:

```ts
    // Dry-grass tufts: flatter low/mid grassy ground.
    if (blades.length < 540 && slope < 0.22 && h > -6 && h < 18 && rng() < 0.34) {
      const tuft = 3 + Math.floor(rng() * 3);
      for (let b = 0; b < tuft && blades.length < 540; b++) {
        const bx = x + (rng() * 2 - 1) * 0.5;
        const bz = z + (rng() * 2 - 1) * 0.5;
        const bh = 0.4 + rng() * 0.45;
        const g = 0.3 + rng() * 0.12;
        blades.push({
          position: [bx, getHeight(bx, bz) + bh * 0.5 - 0.05, bz],
          rotation: [(rng() - 0.5) * 0.5, rng() * Math.PI, (rng() - 0.5) * 0.5],
          scale: [1, bh, 1],
          color: new THREE.Color(g * 0.95, g, g * 0.55),
        });
      }
    }
```

with:

```ts
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
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

Run: `npm run lint`
Expected: no lint errors in `src/components/GroundDetails.tsx` (the pre-existing error from Step 2 is now fixed; no new errors introduced).

Run: `npm run dev`, open the app, and visually confirm grass/pebbles near the stream corridor read greener/darker than the same details on the dry slopes further away.

Stop the dev server after checking.

- [ ] **Step 6: Commit**

```bash
git add src/components/GroundDetails.tsx
git commit -m "Add moisture-based tint drift to pebble and grass ground scatter; fix pre-existing lint error in this file"
```

---

## Task 7: Full integration check

**Files:** none (verification-only task)

**Interfaces:** none

- [ ] **Step 1: Full build + lint**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

Run: `npm run lint`
Expected: no lint errors.

- [ ] **Step 2: Full manual walkthrough**

Run: `npm run dev`, open the app, and check all three modes:

- **Free-roam**: walk from the spawn point north along the valley — confirm the river reads as a continuous, contained body of water the whole way, trees cluster near it and thin out on the dry slopes, and rocks/ground show visible regional color variation rather than a uniform stamped look. Confirm frame rate stays smooth (no stutter from the added instancing/shader work).
- **Guided mode**: step through a couple of waypoints and confirm nothing (tree, water) visually clips through markers, labels, or the camera path.
- **Demo tour**: let the scripted camera run for ~15 seconds and confirm the river and trees read correctly from the cinematic angles too (no z-fighting between the water and terrain, no obviously floating geometry).

Check the browser console for errors/warnings introduced by this work.

Stop the dev server after checking.

- [ ] **Step 3: Update `fixes30082026.md` (project changelog) if the project convention is to log changes there**

Check `fixes30082026.md` at the repo root — if it is being used as a running changelog of work sessions (check its existing content), append a short entry summarizing this session's additions (river, trees, material variety). If it is not that kind of file, skip this step.

- [ ] **Step 4: Final commit (only if Step 3 produced a change)**

```bash
git add fixes30082026.md
git commit -m "Log terrain realism session in changelog"
```
