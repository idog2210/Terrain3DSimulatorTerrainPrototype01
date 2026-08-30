# Terrain realism: river, trees, and material variety

Date: 2026-08-30

## Problem

The terrain simulator's graphics are solid, but the ground reads as
repetitive: rocks share a narrow color range regardless of where they sit,
the terrain albedo texture visibly tiles, and there is no vegetation or
water — just a carved "dry stream" channel. The goal is a more layered,
regionally-varied landscape: a real river where the dry stream already is,
Mediterranean/dry-climate trees, and rock/ground materials that read as
belonging to different parts of the map rather than one stamped-out kit.

## Approach

Introduce a single new derived field in `terrainHeight.ts` — **moisture**,
based on distance to the existing `STREAM_PATH` — as the shared driver for
every new/changed system. This mirrors how `getHeight` already acts as the
one source of truth consumed by the mesh, rocks, ground scatter, contour
lines, and collision. Water, tree placement/density, biome tint, and
rock/ground weathering all read the same field, so the added detail forms
one coherent ecosystem instead of independently-tuned scatter.

## 1. River

The dry stream channel (`streamCarve` in `terrainHeight.ts`) becomes real
water in place — no second river elsewhere on the map (per direction from
the project owner).

- Export `distToStream(x, z)` from `terrainHeight.ts` (already computed
  internally for `streamCarve`; just needs to be exposed) and a
  `moisture01(x, z)` helper (falloff of `distToStream`, clamped to [0,1]).
- New `src/components/River.tsx`: builds a ribbon mesh that follows
  `STREAM_PATH`, sampling terrain height along the centerline (which
  already includes the carve) so the water surface sits inside the
  existing channel with a small margin above the bed. Width tapers with
  the same falloff used by `streamCarve` so the water reads as contained
  by the terrain, not floating above it.
- Material: a `MeshPhysicalMaterial`/`MeshStandardMaterial` extended via
  `onBeforeCompile` (same technique as `advancedTerrainMaterial.ts`) with:
  - a time-driven ripple-normal perturbation (`useFrame` updates a
    uniform) for subtle animated shimmer,
  - Fresnel-driven color mix (darker/greener toward the deep centerline,
    lighter/more transparent toward the banks),
  - soft alpha falloff at the mesh edges so the boundary with the bank
    doesn't read as a hard-edged plane.
- Wired into `TerrainScene.tsx` alongside the other terrain-layer
  components.

## 2. Trees

New `src/components/Trees.tsx`, following the exact scatter pattern
already established by `ImprovedRocks.tsx`/`GroundDetails.tsx`
(mulberry32-seeded deterministic placement, `Instances`/`Instance` from
drei, one `Instances` group per geometry variant).

- 3 low-poly geometry variants built proceduraly (cones/icosahedra, no
  external assets), styled for a dry/Mediterranean setting:
  1. Umbrella-pine-like (flattened wide canopy, mid height),
  2. Scrubby oak-cluster (several overlapping rounded blobs, short),
  3. Slim cypress-like accent (tall, narrow, sparse — used lightly for
     silhouette variety).
- Each tree instance is trunk + foliage; trunks and foliage are separate
  `Instances` groups (like rocks separate variants), colored with an
  olive/sun-bleached palette consistent with the existing terrain
  palette in `terrainHeight.ts`.
- Placement rules (mirroring `buildPlacements` in `ImprovedRocks.tsx`):
  - rejected on steep slope (`getSlope01 > ~0.35`),
  - rejected inside `ROCK_ZONES` (reuse `zoneBoost`) and very close to the
    stream centerline (no trees standing in the water),
  - probability weighted up by `moisture01` (denser riparian clustering
    near the stream, tapering into sparse scatter on the drier slopes),
  - elevation-gated to the grassy/earth bands already defined in
    `terrainColor` (roughly the mid-low elevation range), consistent with
    where the ground is already colored as vegetated rather than bare
    rock.
- Total count kept modest (order ~80-140 trees) for a "real field," not a
  game forest, consistent with the restrained density philosophy already
  documented in `GroundDetails.tsx`.

## 3. Material variety ("stop looking copy-pasted")

Three independent but related changes:

- **Terrain albedo tiling breakup** (`advancedTerrainMaterial.ts`): when a
  real albedo texture is present, sample it twice at a rotated/offset UV
  and blend the two samples by a low-frequency noise mask (the existing
  `tFbm` helper already in the shader). This is a standard cheap
  stochastic-tiling technique and removes the visible repeat grid without
  needing a different texture asset.
- **Biome tinting** (`terrainHeight.ts` `terrainColor`): fold `moisture01`
  into the existing tint math so ground color visibly differs near the
  river (greener/darker) versus the dry slopes (tan/grey), on top of the
  current elevation/slope bands and macro noise tint. This gives the map
  real regional identity instead of relying only on per-vertex noise.
- **Rock & ground scatter zone tinting** (`ImprovedRocks.tsx`,
  `GroundDetails.tsx`): extend the existing per-instance random shade with
  a small deterministic drift keyed to `zoneBoost`/`moisture01` at that
  instance's position — rocks near the stream trend slightly mossier/
  darker, rocks on the sunny ridge/outcrop trend slightly warmer/more
  bleached; grass tuft color also follows `moisture01`. This is additive
  to the current random-shade code, not a replacement.

## Files touched

- `src/utils/terrainHeight.ts` — export `distToStream`, add `moisture01`,
  fold moisture into `terrainColor`.
- `src/components/River.tsx` — new.
- `src/components/Trees.tsx` — new.
- `src/utils/advancedTerrainMaterial.ts` — stochastic tiling breakup.
- `src/components/ImprovedRocks.tsx` — zone-tint drift.
- `src/components/GroundDetails.tsx` — zone-tint drift on pebbles/blades.
- `src/components/TerrainScene.tsx` — wire in `River` and `Trees`.

No changes to controls, the store, markers, or educational content.

## Testing

Run the dev server and visually verify in-browser (free-roam and
guided/demo camera modes):

- water sits inside the carved channel with no floating/clipping,
- trees don't clip into rocks, water, or steep faces,
- the terrain texture no longer shows an obvious repeat grid,
- regional tinting is visible but subtle (not a hard biome border),
- no frame-rate regression from the added instanced geometry / shader
  work.

Type-checking (`tsc`) and lint must pass; there is no existing automated
test suite for visual terrain output, so this is verified by manual
in-browser inspection.
