/**
 * THE KEYSTONE MODULE — art-directed.
 *
 * `getHeight(x, z)` is the single deterministic source of truth for the shape of
 * the world. The terrain mesh, first-person collision, marker placement, rock
 * scattering, the mini-map and the contour lines all sample this one function.
 *
 * The landscape is composed (not random) for a strong opening view: the learner
 * spawns low in the south and looks north up a low valley — carved by a dry
 * stream that leads the eye into depth — toward a tall, craggy ridge with two
 * peaks and a clear saddle between them. A rocky outcrop frames the right
 * foreground. Erosion-like ridged noise roughens the high ground.
 *
 * Coordinate convention (world space, metres): X east, Z south, Y up. The
 * terrain spans [-HALF, HALF] on X and Z. Compact and dense by design.
 */

import { fbm } from './noise';
import type { RGB } from './terrainTypes';

// ---------------------------------------------------------------------------
// World constants
// ---------------------------------------------------------------------------

export const TERRAIN_SIZE = 200; // metres across (terrain spans [-100, 100])
export const HALF = TERRAIN_SIZE / 2;
export const TERRAIN_SEGMENTS = 300; // mesh subdivisions per side (~0.67 m)
export const EYE_HEIGHT = 1.7; // camera height above ground, metres

// ---------------------------------------------------------------------------
// Composition anchors
// ---------------------------------------------------------------------------

const PEAK_W = { x: -44, z: -72 };
const PEAK_E = { x: 40, z: -78 };
const RIDGE_MID = { x: (PEAK_W.x + PEAK_E.x) / 2, z: (PEAK_W.z + PEAK_E.z) / 2 };
const RIDGE_ROT = Math.atan2(PEAK_E.z - PEAK_W.z, PEAK_E.x - PEAK_W.x);
const VALLEY_C = { x: 4, z: 8 };
const OUTCROP = { x: 46, z: 52 };

// Dry stream channel: meanders from below the saddle, down the valley, past the
// viewer — a leading line drawing the eye into the distance.
const STREAM_PATH: ReadonlyArray<readonly [number, number]> = [
  [-2, -62],
  [2, -38],
  [6, -10],
  [8, 18],
  [12, 50],
  [16, 82],
  [20, 99],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function smoothstep(edge0: number, edge1: number, x: number): number {
  let t = (x - edge0) / (edge1 - edge0 || 1);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}

/** Rotated anisotropic Gaussian "bump". */
function bump(
  x: number,
  z: number,
  cx: number,
  cz: number,
  sx: number,
  sz: number,
  h: number,
  rot = 0,
): number {
  const dx = x - cx;
  const dz = z - cz;
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const u = dx * cr + dz * sr;
  const v = -dx * sr + dz * cr;
  return h * Math.exp(-(u * u) / (2 * sx * sx) - (v * v) / (2 * sz * sz));
}

function distSqToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const len2 = abx * abx + abz * abz || 1;
  let t = (apx * abx + apz * abz) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + abx * t;
  const cz = az + abz * t;
  const dx = px - cx;
  const dz = pz - cz;
  return dx * dx + dz * dz;
}

function distToStream(x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < STREAM_PATH.length - 1; i++) {
    const a = STREAM_PATH[i];
    const b = STREAM_PATH[i + 1];
    const d2 = distSqToSegment(x, z, a[0], a[1], b[0], b[1]);
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

/** Depth (positive) carved out by the stream channel. Shallow + wide so the
 *  channel reads clearly without becoming a dark, self-occluded slot. */
function streamCarve(x: number, z: number): number {
  const d = distToStream(x, z);
  const w = 6.5;
  return 5 * Math.exp(-(d * d) / (2 * w * w));
}

// ---------------------------------------------------------------------------
// The height function
// ---------------------------------------------------------------------------

export function getHeight(x: number, z: number): number {
  let h = 0;

  // Regional tilt: north (the ridge) sits higher; the south foreground/valley
  // sits lower, so the viewer looks up into the scene.
  h += -z * 0.075;

  // Multi-scale natural relief.
  h += (fbm(x * 0.008 + 4.2, z * 0.008 - 1.7, 4) - 0.5) * 16; // large
  h += (fbm(x * 0.025 + 11, z * 0.025 - 7, 4) - 0.5) * 7; // medium
  h += (fbm(x * 0.05 - 5, z * 0.05 + 9, 3) - 0.5) * 3.5; // secondary
  h += (fbm(x * 0.1, z * 0.1, 3) - 0.5) * 2.2; // fine
  h += (fbm(x * 0.24, z * 0.24, 2) - 0.5) * 0.8; // micro

  // The two ridge peaks.
  h += bump(x, z, PEAK_W.x, PEAK_W.z, 26, 22, 50);
  h += bump(x, z, PEAK_E.x, PEAK_E.z, 24, 20, 44);

  // Connecting crest — much lower than the peaks, so a clean saddle forms.
  h += bump(x, z, RIDGE_MID.x, RIDGE_MID.z, 48, 9, 14, RIDGE_ROT);

  // Erosion-like ridged crags, concentrated on the high ground.
  const ridged = 1 - Math.abs(fbm(x * 0.06 + 20, z * 0.06 - 13, 4) * 2 - 1);
  h += (ridged - 0.45) * 7 * smoothstep(18, 44, h);

  // Rocky outcrop framing the right foreground.
  h += bump(x, z, OUTCROP.x, OUTCROP.z, 13, 15, 14);
  h += bump(x, z, 52, 46, 6, 6, 7);

  // Broad valley basin leading into depth.
  h -= bump(x, z, VALLEY_C.x, VALLEY_C.z, 50, 46, 16);

  // Dry stream channel.
  h -= streamCarve(x, z);

  return h;
}

// ---------------------------------------------------------------------------
// Derived quantities
// ---------------------------------------------------------------------------

export function getNormal(x: number, z: number, eps = 0.6): [number, number, number] {
  const hL = getHeight(x - eps, z);
  const hR = getHeight(x + eps, z);
  const hD = getHeight(x, z - eps);
  const hU = getHeight(x, z + eps);
  const nx = hL - hR;
  const ny = 2 * eps;
  const nz = hD - hU;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

export function getSlopeAngle(x: number, z: number): number {
  const ny = getNormal(x, z)[1];
  return Math.acos(ny < -1 ? -1 : ny > 1 ? 1 : ny);
}

export function getSlope01(x: number, z: number): number {
  return getSlopeAngle(x, z) / (Math.PI / 2);
}

// ---------------------------------------------------------------------------
// Named feature anchors
// ---------------------------------------------------------------------------

export const FEATURES = {
  hilltop: { x: PEAK_W.x, z: PEAK_W.z },
  ridge: { x: -24, z: -73 },
  saddle: { x: RIDGE_MID.x, z: RIDGE_MID.z },
  slope: { x: 36, z: -46 },
  valley: { x: 4, z: 10 },
  stream: { x: 8, z: 18 },
  rocky: { x: 50, z: -64 },
} as const;

/** Designated rocky-zone anchors that attract rock scatter (ridge flanks + outcrop). */
export const ROCK_ZONES: ReadonlyArray<{ x: number; z: number; r: number }> = [
  { x: FEATURES.rocky.x, z: FEATURES.rocky.z, r: 30 },
  { x: OUTCROP.x, z: OUTCROP.z, r: 22 },
  { x: PEAK_E.x, z: PEAK_E.z, r: 26 },
];

// ---------------------------------------------------------------------------
// Cached elevation range
// ---------------------------------------------------------------------------

let cachedRange: { min: number; max: number } | null = null;

export function getHeightRange(): { min: number; max: number } {
  if (cachedRange) return cachedRange;
  let min = Infinity;
  let max = -Infinity;
  const step = TERRAIN_SIZE / 130;
  for (let x = -HALF; x <= HALF; x += step) {
    for (let z = -HALF; z <= HALF; z += step) {
      const h = getHeight(x, z);
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }
  cachedRange = { min, max };
  return cachedRange;
}

// ---------------------------------------------------------------------------
// Shared natural color (terrain mesh base palette + mini-map)
// ---------------------------------------------------------------------------

const PALETTE = {
  channel: { r: 0.36, g: 0.33, b: 0.28 }, // damp drainage soil (visibly lit, never black)
  lowEarth: { r: 0.46, g: 0.4, b: 0.3 }, // alluvial soil in the low ground
  dryGrass: { r: 0.49, g: 0.52, b: 0.33 }, // muted olive dry grass
  earth: { r: 0.48, g: 0.4, b: 0.27 }, // warm tan upland earth
  rock: { r: 0.43, g: 0.43, b: 0.42 }, // neutral muted grey rock
  highRock: { r: 0.6, g: 0.59, b: 0.57 }, // sun-bleached high rock
} as const;

function mix(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

/** Low-frequency macro tint in [0,1] to break flat color banding. */
export function colorTint(x: number, z: number): number {
  return fbm(x * 0.03 + 50, z * 0.03 - 20, 3);
}

/**
 * Natural terrain color from elevation and slope (+ optional macro tint).
 * Zones: dark drainage soil (low) → dry grass/earth (mid) → exposed rock
 * (high & steep). Bands are tuned to the art-directed elevation range.
 */
export function terrainColor(height: number, slope01: number, tint = 0.5): RGB {
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
  // Steep ground exposes rock.
  const rockBlend = smoothstep(0.4, 0.7, slope01);
  c = mix(c, PALETTE.rock, rockBlend * 0.9);
  // Bare rock dominates the very high crest.
  c = mix(c, PALETTE.rock, smoothstep(44, 60, height) * 0.4);
  return c;
}

/** Slope heat-map color (cool = flat, warm/red = steep) for the slope layer. */
export function slopeHeatColor(slope01: number): RGB {
  const stops: RGB[] = [
    { r: 0.16, g: 0.42, b: 0.45 },
    { r: 0.3, g: 0.55, b: 0.3 },
    { r: 0.78, g: 0.72, b: 0.28 },
    { r: 0.82, g: 0.45, b: 0.18 },
    { r: 0.74, g: 0.22, b: 0.16 },
  ];
  const t = (slope01 < 0 ? 0 : slope01 > 1 ? 1 : slope01) * (stops.length - 1);
  const i = Math.floor(t);
  const f = t - i;
  if (i >= stops.length - 1) return stops[stops.length - 1];
  return mix(stops[i], stops[i + 1], f);
}
