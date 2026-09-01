import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EYE_HEIGHT, HALF, getHeight } from '../utils/terrainHeight';
import { getWaterDepth, getWaterSpeedMultiplier } from '../utils/waterChannel';
import { useSimStore } from '../store';
import { markerObjects } from '../markerRegistry';
import { getColliders, pushOutOfColliders } from '../colliderRegistry';
import { playerPose, SPAWN } from '../playerPose';
import type { ConceptId } from '../utils/terrainTypes';

const WALK_SPEED = 6; // m/s — brisk but realistic field pace
const RUN_SPEED = 13; // m/s (Shift)
const JUMP_SPEED = 7; // m/s — initial upward velocity (Space)
const GRAVITY = 20; // m/s^2
const BOUND = HALF - 3;
const PLAYER_RADIUS = 0.35; // m — used to keep the player out of rock/tree colliders
const JUMP_CLEAR_MARGIN = 0.15; // m — how far above a hard obstacle's top counts as "cleared" mid-jump
const GAZE_MAX = 450; // m — exceeds the terrain diagonal so any visible beacon is selectable

/**
 * Drives the camera as a person walking the terrain:
 *   - WASD and arrow keys move relative to where you are looking (Shift = run)
 *   - the camera is pinned to ground height + eye height every frame (never clips)
 *   - mouse-look is provided by PointerLockControls (added in TerrainScene)
 *   - while pointer-locked, the crosshair selects whichever marker it rests on
 * It also publishes the player's pose to the module ref read by the mini-map.
 */
export default function FirstPersonController() {
  const camera = useThree((s) => s.camera);
  const setHovered = useSimStore((s) => s.setHovered);
  const select = useSimStore((s) => s.select);

  const keys = useRef<Record<string, boolean>>({});
  const raycaster = useRef(new THREE.Raycaster());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3()); // target velocity (m/s)
  const velocity = useRef(new THREE.Vector3()); // smoothed velocity (m/s)
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const center = useRef(new THREE.Vector2(0, 0));
  const bobPhase = useRef(0);
  const bob = useRef(0);
  const airborne = useRef(0); // height above ground from jumping (m)
  const jumpVelocity = useRef(0); // vertical velocity while airborne (m/s)
  const lastReset = useRef(useSimStore.getState().resetCount);

  // Snap to the spawn point the moment this controller mounts, so free
  // exploration always begins there regardless of where the pre-start
  // demo tour camera happened to be when the learner clicked "start".
  useEffect(() => {
    camera.position.set(SPAWN.x, getHeight(SPAWN.x, SPAWN.z) + EYE_HEIGHT, SPAWN.z);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard + gaze-click listeners.
  useEffect(() => {
    const MOVE_CODES = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    ]);
    const onKeyDown = (e: KeyboardEvent) => {
      if (MOVE_CODES.has(e.code)) e.preventDefault();
      if (e.code === 'Space') {
        e.preventDefault();
        if (airborne.current <= 0) jumpVelocity.current = JUMP_SPEED;
      }
      keys.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const clear = () => {
      keys.current = {};
    };
    // While locked, a click selects the marker under the crosshair.
    const onMouseDown = () => {
      if (!document.pointerLockElement) return;
      const id = useSimStore.getState().hoveredId;
      if (id) select(id);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clear);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clear);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [select]);

  useFrame((_state, delta) => {
    const k = keys.current;
    const dt = Math.min(delta, 0.05); // clamp against frame spikes

    // Reset-to-spawn request from the UI.
    const rc = useSimStore.getState().resetCount;
    if (rc !== lastReset.current) {
      lastReset.current = rc;
      camera.position.set(SPAWN.x, getHeight(SPAWN.x, SPAWN.z) + EYE_HEIGHT, SPAWN.z);
      velocity.current.set(0, 0, 0);
      bob.current = 0;
      airborne.current = 0;
      jumpVelocity.current = 0;
    }

    // Camera-relative horizontal basis.
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    if (forward.current.lengthSq() < 1e-6) forward.current.set(0, 0, -1);
    forward.current.normalize();
    right.current.crossVectors(forward.current, up.current).normalize();

    const fwd = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
    const str = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);

    // Wading: deeper water slows walking, per a real-world depth/speed study
    // (ankle ~90-95% of land speed, down to ~25-40% at waist depth). No swim
    // mode — the multiplier just floors out past the waist anchor.
    const waterDepth = getWaterDepth(camera.position.x, camera.position.z);
    const waterSpeedMul = getWaterSpeedMultiplier(waterDepth);

    // Target velocity from input.
    desired.current.set(0, 0, 0);
    if (fwd !== 0 || str !== 0) {
      desired.current
        .addScaledVector(forward.current, fwd)
        .addScaledVector(right.current, str)
        .normalize()
        .multiplyScalar((k['ShiftLeft'] || k['ShiftRight'] ? RUN_SPEED : WALK_SPEED) * waterSpeedMul);
    }
    // Smoothly accelerate / decelerate toward the target velocity — snappy
    // enough to feel planted, not floaty.
    const accel = 1 - Math.exp(-13 * dt);
    velocity.current.lerp(desired.current, accel);

    let x = camera.position.x + velocity.current.x * dt;
    let z = camera.position.z + velocity.current.z * dt;

    // Approximate feet height at the tentative position — lets a high-enough
    // jump clear a short hard obstacle instead of being walled by it mid-air.
    const feetHeight = getHeight(x, z) + airborne.current;

    // Push the player back out of any hard (non-climbable) collider it now
    // overlaps, along the penetration normal — resolved fresh every frame,
    // which reads as sliding along the obstacle rather than a hard stop.
    // Climbable (short) rocks are skipped here; they're handled below by
    // raising the ground height instead, so the player walks up onto them.
    ({ x, z } = pushOutOfColliders(x, z, feetHeight, PLAYER_RADIUS, JUMP_CLEAR_MARGIN));

    x = Math.max(-BOUND, Math.min(BOUND, x));
    z = Math.max(-BOUND, Math.min(BOUND, z));
    camera.position.x = x;
    camera.position.z = z;

    // Extremely subtle walking head-bob for life, proportional to speed (eases
    // to 0 at rest). Kept tiny so the eye height feels stable.
    const speed = velocity.current.length();
    if (speed > 0.4) {
      bobPhase.current += dt * (4 + speed * 0.5);
      const targetBob = Math.sin(bobPhase.current) * 0.016 * Math.min(1, speed / WALK_SPEED);
      bob.current += (targetBob - bob.current) * Math.min(1, dt * 14);
    } else {
      bob.current += (0 - bob.current) * Math.min(1, dt * 10);
    }

    // Jump physics: integrate gravity, land back on the ground.
    jumpVelocity.current -= GRAVITY * dt;
    airborne.current += jumpVelocity.current * dt;
    if (airborne.current <= 0) {
      airborne.current = 0;
      jumpVelocity.current = 0;
    }

    // Climbable (short) rocks raise the walkable surface within their footprint —
    // smoothly toward their peak at the center, easing back to bare terrain at
    // the edge — so the player walks up onto them instead of being blocked.
    let groundY = getHeight(x, z);
    for (const c of getColliders()) {
      if (!c.climbable || c.topY === undefined) continue;
      const dx = x - c.x;
      const dz = z - c.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < c.radius) {
        const t = 1 - dist / c.radius;
        groundY = Math.max(groundY, THREE.MathUtils.lerp(groundY, c.topY, t));
      }
    }

    // Pin the eye to the ground (plus jump offset) every frame — planted, never clipping.
    camera.position.y = groundY + EYE_HEIGHT + bob.current + airborne.current;

    // Publish pose for the mini-map (heading: 0 = north / -Z).
    playerPose.x = x;
    playerPose.z = z;
    playerPose.heading = Math.atan2(forward.current.x, -forward.current.z);

    // Gaze selection: while locked, highlight the marker under the crosshair.
    if (document.pointerLockElement && markerObjects.length > 0) {
      raycaster.current.setFromCamera(center.current, camera);
      const hit = raycaster.current.intersectObjects(markerObjects, false)[0];
      let hoverId: ConceptId | null = null;
      if (hit && hit.distance < GAZE_MAX) {
        hoverId = (hit.object.userData.conceptId as ConceptId) ?? null;
      }
      setHovered(hoverId);
    } else if (useSimStore.getState().hoveredId) {
      // Unlocked: clear any stale gaze highlight so no marker stays enlarged.
      setHovered(null);
    }
  });

  return null;
}
