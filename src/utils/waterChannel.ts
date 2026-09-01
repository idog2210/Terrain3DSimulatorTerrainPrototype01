/**
 * The river channel's geometry (centerline, per-rib width, bank heights) is
 * the single source of truth for both what the water mesh looks like
 * (River.tsx) and where/how deep it is for gameplay (FirstPersonController's
 * wading speed). Computed once from STREAM_PATH + getHeight — deterministic,
 * so it's safe to cache at module scope.
 */

import * as THREE from 'three';
import { STREAM_PATH, getHeight } from './terrainHeight';
import { fbm } from './noise';

const SEGMENTS_PER_SPAN = 14;
const BASE_WIDTH = 3.4;

// Vertical clearance each bank keeps above the terrain sampled right beneath
// it (see River.tsx for the full rationale).
const WATER_CLEARANCE = 0.25;

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export interface RiverChannel {
  steps: number;
  centers: THREE.Vector3[];
  normals: THREE.Vector3[];
  halfWidths: number[];
  flowSpeeds: number[];
  /** Smoothed water-surface height at the left/right edge of each rib. */
  leftHeights: number[];
  rightHeights: number[];
  /** Raw ground height at the centerline of each rib. */
  centerGround: number[];
}

let cached: RiverChannel | null = null;

export function getRiverChannel(): RiverChannel {
  if (cached) return cached;

  const controlPoints = STREAM_PATH.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.4);
  const steps = (STREAM_PATH.length - 1) * SEGMENTS_PER_SPAN;

  const centers: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    centers.push(curve.getPoint(i / steps));
  }

  const normals: THREE.Vector3[] = [];
  const halfWidths: number[] = [];
  const flowSpeeds: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const prev = centers[Math.max(0, i - 1)];
    const next = centers[Math.min(steps, i + 1)];
    const tangent = new THREE.Vector3().subVectors(next, prev);
    tangent.y = 0;
    if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
    tangent.normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
    normals.push(normal);

    const taper = smoothstep01(0, 0.06, t) * (1 - smoothstep01(0.94, 1, t));
    const widthMul = 0.78 + fbm(t * 9 + 3.1, 7.7, 2) * 0.55; // ~[0.78, 1.33]
    halfWidths.push((BASE_WIDTH * 0.5) * widthMul * Math.max(0.05, taper));
    flowSpeeds.push(Math.min(1.7, Math.max(0.55, 1 / widthMul)));
  }

  const leftHeights: number[] = [];
  const rightHeights: number[] = [];
  const centerGround: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = centers[i];
    const normal = normals[i];
    const hw = halfWidths[i];
    const hCenter = getHeight(p.x, p.z);
    const hLeft = getHeight(p.x + normal.x * hw, p.z + normal.z * hw);
    const hRight = getHeight(p.x - normal.x * hw, p.z - normal.z * hw);
    leftHeights.push(Math.max(hLeft, hCenter) + WATER_CLEARANCE);
    rightHeights.push(Math.max(hRight, hCenter) + WATER_CLEARANCE);
    centerGround.push(hCenter);
  }

  const smooth3 = (arr: number[]) =>
    arr.map((h, i) => {
      const prev = arr[Math.max(0, i - 1)];
      const next = arr[Math.min(steps, i + 1)];
      return (prev + h + next) / 3;
    });

  cached = {
    steps,
    centers,
    normals,
    halfWidths,
    flowSpeeds,
    leftHeights: smooth3(leftHeights),
    rightHeights: smooth3(rightHeights),
    centerGround,
  };
  return cached;
}

/**
 * True submersion depth (metres) at (x, z): water-surface height at that
 * point (interpolated across the channel's cross-section) minus the real
 * ground height there. 0 outside the river footprint.
 */
export function getWaterDepth(x: number, z: number): number {
  const { steps, centers, normals, halfWidths, leftHeights, rightHeights } = getRiverChannel();

  let bestI = 0;
  let bestD2 = Infinity;
  for (let i = 0; i <= steps; i++) {
    const c = centers[i];
    const dx = x - c.x;
    const dz = z - c.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestI = i;
    }
  }

  const halfWidth = halfWidths[bestI];
  if (halfWidth <= 0.001) return 0;

  const c = centers[bestI];
  const normal = normals[bestI];
  const s = (x - c.x) * normal.x + (z - c.z) * normal.z; // signed offset, + = left side
  if (Math.abs(s) > halfWidth) return 0;

  const u = (halfWidth - s) / (2 * halfWidth); // 0 at left edge, 1 at right edge
  const waterY = leftHeights[bestI] + (rightHeights[bestI] - leftHeights[bestI]) * u;
  const depth = waterY - getHeight(x, z);
  return depth > 0 ? depth : 0;
}

// Wading speed as a fraction of land speed, from a real-world walking-speed
// vs. water-depth comparison (ankle ~90-95%, mid-shin ~75-85%, knee ~60-70%,
// hip ~40-55%, waist ~25-40%, deeper is swimming territory). Anchors use the
// midpoint of each range at a representative depth (metres, human scale via
// EYE_HEIGHT = 1.7 m); values interpolate smoothly between them. Beyond the
// waist anchor the multiplier holds at its floor — no swim mode is modeled.
const DEPTH_SPEED_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [0, 1.0],
  [0.12, 0.925], // ankle
  [0.45, 0.8], // mid-shin
  [0.7, 0.65], // knee
  [1.0, 0.475], // hip
  [1.3, 0.325], // waist (floor)
];

export function getWaterSpeedMultiplier(depth: number): number {
  if (depth <= 0) return 1;
  const anchors = DEPTH_SPEED_ANCHORS;
  const last = anchors[anchors.length - 1];
  if (depth >= last[0]) return last[1];
  for (let i = 1; i < anchors.length; i++) {
    const [d0, m0] = anchors[i - 1];
    const [d1, m1] = anchors[i];
    if (depth <= d1) {
      const t = (depth - d0) / (d1 - d0);
      return m0 + (m1 - m0) * t;
    }
  }
  return last[1];
}
