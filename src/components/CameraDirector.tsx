import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EYE_HEIGHT, getHeight } from '../utils/terrainHeight';
import { TERRAIN_CONCEPTS } from '../data/terrainConcepts';
import { useSimStore } from '../store';
import { playerPose } from '../playerPose';

/**
 * Hands-free camera for guided and demo modes (mounted instead of the
 * first-person controller).
 *   - guided: smoothly glides to stand exactly at the current concept's
 *     marker point, facing the same direction its curated `view` used to
 *     look at it from. From there, pointer-lock mouse-look (mounted
 *     alongside this component, same as free mode) lets the learner freely
 *     look around 360° — the heading snaps back to that curated facing
 *     whenever the concept changes, so it can never wander or "stick".
 *   - demo: a slow cinematic orbit over the hill massif for presenting the
 *     prototype without walking.
 * It keeps the mini-map pose updated from the live camera.
 */

// Demo orbit parameters.
const DEMO_CENTER = { x: -8, z: -28 };
const DEMO_RADIUS = 108;
const DEMO_HEIGHT = 22;
const DEMO_SPEED = 0.075; // rad/s

export default function CameraDirector() {
  const camera = useThree((s) => s.camera);
  const mode = useSimStore((s) => s.mode);
  const guidedIndex = useSimStore((s) => s.guidedIndex);

  const targetPos = useRef(new THREE.Vector3());
  const baseQuat = useRef(new THREE.Quaternion()); // curated facing for the current concept
  const aim = useRef(new THREE.Object3D());
  const fwd = useRef(new THREE.Vector3());
  const demoAngle = useRef(0.6);

  // Compute the guided target whenever the concept changes: stand at the
  // marker's own point, but keep the same facing direction the old curated
  // `view` vantage used to look at it from. Snap the heading immediately —
  // pointer-lock free-look (mounted in TerrainScene) owns rotation from here
  // until the next concept change.
  useEffect(() => {
    if (mode !== 'guided') return;
    const c = TERRAIN_CONCEPTS[guidedIndex];
    if (!c) return;
    const py = getHeight(c.position.x, c.position.z) + EYE_HEIGHT;
    targetPos.current.set(c.position.x, py, c.position.z);

    const vy = getHeight(c.view.x, c.view.z) + EYE_HEIGHT;
    const ly = getHeight(c.position.x, c.position.z) + 4;
    aim.current.position.set(c.view.x, vy, c.view.z);
    aim.current.up.set(0, 1, 0);
    aim.current.lookAt(c.position.x, ly, c.position.z);
    baseQuat.current.copy(aim.current.quaternion);
    camera.quaternion.copy(baseQuat.current);
  }, [mode, guidedIndex, camera]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);

    if (mode === 'guided') {
      const k = 1 - Math.exp(-2.8 * dt); // smooth ease toward the marker point
      camera.position.lerp(targetPos.current, k);
    } else if (mode === 'demo') {
      demoAngle.current += dt * DEMO_SPEED;
      const x = DEMO_CENTER.x + Math.cos(demoAngle.current) * DEMO_RADIUS;
      const z = DEMO_CENTER.z + Math.sin(demoAngle.current) * DEMO_RADIUS;
      const y = Math.max(getHeight(x, z) + 6, DEMO_HEIGHT);
      camera.position.set(x, y, z);
      camera.lookAt(DEMO_CENTER.x, 16, DEMO_CENTER.z);
    }

    // Keep the mini-map pose in sync with the live camera.
    camera.getWorldDirection(fwd.current);
    playerPose.x = camera.position.x;
    playerPose.z = camera.position.z;
    playerPose.heading = Math.atan2(fwd.current.x, -fwd.current.z);
  });

  return null;
}
