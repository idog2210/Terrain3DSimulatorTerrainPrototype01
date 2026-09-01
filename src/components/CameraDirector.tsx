import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EYE_HEIGHT, getHeight } from '../utils/terrainHeight';
import { getWaterDepth, getWaterSpeedMultiplier } from '../utils/waterChannel';
import { TERRAIN_CONCEPTS } from '../data/terrainConcepts';
import { useSimStore } from '../store';
import { pushOutOfColliders } from '../colliderRegistry';
import { playerPose } from '../playerPose';

/**
 * Camera for guided mode (mounted instead of the first-person controller,
 * alongside the same PointerLockControls free mode uses). Movement uses
 * exactly the same physics as free mode's FirstPersonController — same
 * accel curve, run with Shift, head-bob, water wading, collider push-out
 * every frame — with two differences: wandering is clamped to a 10m circle
 * around the current concept's marker instead of the world bounds, and
 * whenever the concept changes the camera auto-walks (same physics, just
 * autopiloted toward the new anchor instead of reading WASD) to the new
 * station and snaps facing to its curated `view` vantage on arrival.
 * It keeps the mini-map pose updated from the live camera.
 */

export const WANDER_RADIUS = 10; // m — how far the learner can wander from each station's anchor
// Turned into the tour's opening view (hilltop) only, so the learner doesn't
// start staring straight down the curated `view` vantage every time.
const START_YAW_RIGHT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
const WALK_SPEED = 6; // m/s
const RUN_SPEED = 13; // m/s (Shift)
const TRAVEL_SPEED = 32; // m/s — auto-walk speed when a new concept recenters the anchor (faster than manual run, since it's an unskippable autopilot, not player-controlled movement)
const ARRIVE_DIST = 0.2; // m — how close counts as "arrived" at the new station
const PLAYER_RADIUS = 0.35; // m — keeps the camera out of rock/tree colliders

export default function CameraDirector() {
  const camera = useThree((s) => s.camera);
  const mode = useSimStore((s) => s.mode);
  const guidedIndex = useSimStore((s) => s.guidedIndex);

  const anchor = useRef(new THREE.Vector2()); // station's ground (x, z)
  const traveling = useRef(false); // true while auto-walking to a newly-selected station
  const facing = useRef(new THREE.Quaternion()); // curated facing, applied once travel arrives
  const fwd = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const toAnchor = useRef(new THREE.Vector2());
  const desired = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector3());
  const keys = useRef<Record<string, boolean>>({});
  const bobPhase = useRef(0);
  const bob = useRef(0);
  const firstConcept = useRef(true); // snap (don't walk in) on mount, regardless of the pre-start tour's last position
  const lastAppliedIndex = useRef(-1); // guards against StrictMode's dev-only double-invoke re-running this for the same station

  // Recenter the wander circle on the marker's own point whenever the concept
  // changes, and start walking there — same physics as manual WASD, just
  // autopiloted. Facing snaps to the curated `view` vantage once arrived.
  useEffect(() => {
    if (mode !== 'guided') return;
    if (lastAppliedIndex.current === guidedIndex) return;
    lastAppliedIndex.current = guidedIndex;
    const c = TERRAIN_CONCEPTS[guidedIndex];
    if (!c) return;
    anchor.current.set(c.position.x, c.position.z);

    const vy = getHeight(c.view.x, c.view.z) + EYE_HEIGHT;
    const ly = getHeight(c.position.x, c.position.z) + 4;
    const aim = new THREE.Object3D();
    aim.position.set(c.view.x, vy, c.view.z);
    aim.up.set(0, 1, 0);
    aim.lookAt(c.position.x, ly, c.position.z);
    facing.current.copy(aim.quaternion);

    if (firstConcept.current) {
      firstConcept.current = false;
      camera.position.set(c.position.x, getHeight(c.position.x, c.position.z) + EYE_HEIGHT, c.position.z);
      camera.quaternion.copy(facing.current).premultiply(START_YAW_RIGHT);
      traveling.current = false;
    } else {
      traveling.current = true;
    }
    velocity.current.set(0, 0, 0);
  }, [mode, guidedIndex, camera]);

  // WASD/arrow-key wander, same keys and feel as free mode.
  useEffect(() => {
    if (mode !== 'guided') return;
    const MOVE_CODES = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    ]);
    const onKeyDown = (e: KeyboardEvent) => {
      if (MOVE_CODES.has(e.code)) e.preventDefault();
      keys.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const clear = () => {
      keys.current = {};
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clear);
    };
  }, [mode]);

  useFrame((_state, delta) => {
    if (mode !== 'guided') return;
    const dt = Math.min(delta, 0.05);

    toAnchor.current.set(anchor.current.x - camera.position.x, anchor.current.y - camera.position.z);
    const distToAnchor = toAnchor.current.length();
    if (traveling.current && distToAnchor <= ARRIVE_DIST) {
      traveling.current = false;
      camera.quaternion.copy(facing.current);
    }

    desired.current.set(0, 0, 0);
    if (traveling.current) {
      // Autopilot: walk straight at the new station's anchor, same physics
      // as manual movement below (collision, water, bob included).
      toAnchor.current.normalize();
      desired.current.set(toAnchor.current.x, 0, toAnchor.current.y).multiplyScalar(TRAVEL_SPEED);
    } else {
      // Camera-relative horizontal basis, from wherever pointer-lock is
      // currently looking — same convention as free mode.
      camera.getWorldDirection(forward.current);
      forward.current.y = 0;
      if (forward.current.lengthSq() < 1e-6) forward.current.set(0, 0, -1);
      forward.current.normalize();
      right.current.crossVectors(forward.current, up.current).normalize();

      const k = keys.current;
      const f = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
      const s = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);

      const waterDepth = getWaterDepth(camera.position.x, camera.position.z);
      const waterSpeedMul = getWaterSpeedMultiplier(waterDepth);

      if (f !== 0 || s !== 0) {
        desired.current
          .addScaledVector(forward.current, f)
          .addScaledVector(right.current, s)
          .normalize()
          .multiplyScalar((k['ShiftLeft'] || k['ShiftRight'] ? RUN_SPEED : WALK_SPEED) * waterSpeedMul);
      }
    }

    const accel = 1 - Math.exp((traveling.current ? -26 : -13) * dt);
    velocity.current.lerp(desired.current, accel);

    let x = camera.position.x + velocity.current.x * dt;
    let z = camera.position.z + velocity.current.z * dt;

    // Push back out of any rock/tree collider it now overlaps — resolved
    // fresh every frame, exactly like free mode, so neither the walk nor
    // the auto-travel ever clips through solid geometry.
    const pushed = pushOutOfColliders(x, z, getHeight(x, z), PLAYER_RADIUS);
    x = pushed.x;
    z = pushed.z;

    // Once arrived, keep manual wandering inside the station's radius.
    if (!traveling.current) {
      const dx = x - anchor.current.x;
      const dz = z - anchor.current.y;
      const distSq = dx * dx + dz * dz;
      if (distSq > WANDER_RADIUS * WANDER_RADIUS) {
        const dist = Math.sqrt(distSq);
        x = anchor.current.x + (dx / dist) * WANDER_RADIUS;
        z = anchor.current.y + (dz / dist) * WANDER_RADIUS;
      }
    }

    camera.position.x = x;
    camera.position.z = z;

    // Extremely subtle walking head-bob for life, proportional to speed (eases
    // to 0 at rest) — same as free mode.
    const speed = velocity.current.length();
    if (speed > 0.4) {
      bobPhase.current += dt * (4 + speed * 0.5);
      const targetBob = Math.sin(bobPhase.current) * 0.016 * Math.min(1, speed / WALK_SPEED);
      bob.current += (targetBob - bob.current) * Math.min(1, dt * 14);
    } else {
      bob.current += (0 - bob.current) * Math.min(1, dt * 10);
    }

    camera.position.y = getHeight(x, z) + EYE_HEIGHT + bob.current;

    // Keep the mini-map pose in sync with the live camera.
    camera.getWorldDirection(fwd.current);
    playerPose.x = camera.position.x;
    playerPose.z = camera.position.z;
    playerPose.heading = Math.atan2(fwd.current.x, -fwd.current.z);
  });

  return null;
}
