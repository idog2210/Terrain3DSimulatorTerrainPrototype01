/**
 * Live registry of ground-plane collision circles (rocks, tree trunks). Scatter
 * components register their placements' colliders here on mount, keyed by an
 * owner id so each component's set can be swapped/removed independently; the
 * FirstPersonController resolves player movement against the flattened list
 * every frame. Mirrors the markerRegistry.ts pattern used for gaze selection.
 */
export interface Collider {
  x: number;
  z: number;
  radius: number;
  /** World-space Y of the object's peak. Enables jump-over (hard colliders) and
   * climb-on-top (climbable colliders) behavior; omit for a plain always-blocking
   * wall (e.g. trees) that jumping never clears. */
  topY?: number;
  /** If true, the player walks up onto this collider (ground height raised within
   * its footprint) instead of being blocked by it. */
  climbable?: boolean;
}

const groups = new Map<string, Collider[]>();
let flat: Collider[] = [];

function rebuild(): void {
  flat = ([] as Collider[]).concat(...groups.values());
}

export function registerColliders(ownerId: string, colliders: Collider[]): void {
  groups.set(ownerId, colliders);
  rebuild();
}

export function unregisterColliders(ownerId: string): void {
  groups.delete(ownerId);
  rebuild();
}

export function getColliders(): Collider[] {
  return flat;
}

const RESOLVE_ITERATIONS = 4; // passes per call — lets overlapping colliders (a push out of one

// nudging into another) settle to a single stable point within the same frame, instead of
// leaving residual overlap that would otherwise creep the caller further every subsequent frame

/**
 * Pushes a tentative (x, z) back out of any hard (non-climbable) collider it
 * overlaps, along the penetration normal — shared by every controller that
 * walks or glides the camera across the ground, so nothing (player or
 * scripted camera) ever ends up inside solid rock/tree geometry. Iterates a
 * few passes so a cluster of overlapping colliders resolves to one stable
 * point per call rather than drifting frame over frame.
 */
export function pushOutOfColliders(
  x: number,
  z: number,
  feetHeight: number,
  playerRadius: number,
  jumpClearMargin = 0,
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (let iter = 0; iter < RESOLVE_ITERATIONS; iter++) {
    let moved = false;
    for (const c of getColliders()) {
      if (c.climbable) continue;
      if (c.topY !== undefined && feetHeight >= c.topY + jumpClearMargin) continue;
      const dx = px - c.x;
      const dz = pz - c.z;
      const minDist = c.radius + playerRadius;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist && distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        const push = minDist - dist;
        px += (dx / dist) * push;
        pz += (dz / dist) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { x: px, z: pz };
}
