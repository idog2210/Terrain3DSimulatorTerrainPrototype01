/**
 * Live player pose, written by the first-person controller every frame and read
 * by the mini-map's own animation loop. Kept as a plain mutable module object
 * (not in the zustand store) so these high-frequency writes never allocate or
 * trigger React re-renders.
 */
export interface PlayerPose {
  x: number;
  z: number;
  /** Heading in radians (0 = facing -Z / north), for the mini-map arrow. */
  heading: number;
}

/** Spawn point: low in the south, looking north up the valley to the ridge. */
export const SPAWN = { x: 4, z: 86 };

export const playerPose: PlayerPose = { x: SPAWN.x, z: SPAWN.z, heading: 0 };
