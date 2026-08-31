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
 *   - guided: smoothly glides to the current concept's curated viewpoint and
 *     frames its beacon, so the learner just clicks Next / Previous. The
 *     learner can also drag the mouse to freely look around 360° from that
 *     viewpoint — the drag offset composes on top of the curated aim and
 *     resets whenever the concept changes, so it can never wander or "stick".
 *   - demo: a slow cinematic orbit over the hill massif for presenting the
 *     prototype without walking.
 * It keeps the mini-map pose updated from the live camera.
 */

// Demo orbit parameters.
const DEMO_CENTER = { x: -8, z: -28 };
const DEMO_RADIUS = 108;
const DEMO_HEIGHT = 22;
const DEMO_SPEED = 0.075; // rad/s

// Guided free-look (mouse drag) parameters.
const LOOK_SENSITIVITY = 0.0032; // rad per pixel of drag
const PITCH_LIMIT = 1.4; // rad (~80°) — stays short of straight up/down

export default function CameraDirector() {
  const camera = useThree((s) => s.camera);
  const mode = useSimStore((s) => s.mode);
  const guidedIndex = useSimStore((s) => s.guidedIndex);

  const targetPos = useRef(new THREE.Vector3());
  const baseQuat = useRef(new THREE.Quaternion()); // curated aim for the current concept
  const targetQuat = useRef(new THREE.Quaternion()); // baseQuat + free-look offset
  const aim = useRef(new THREE.Object3D());
  const fwd = useRef(new THREE.Vector3());
  const demoAngle = useRef(0.6);

  // Free-look drag offset (guided mode only).
  const userYaw = useRef(0);
  const userPitch = useRef(0);
  const lookEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const lookQuat = useRef(new THREE.Quaternion());

  // Mouse-drag look, scoped to the canvas so panel/button clicks (Next,
  // Prev, Exit tour...) never start a drag.
  useEffect(() => {
    if (mode !== 'guided') return;
    const canvas = document.querySelector<HTMLCanvasElement>('.app canvas');
    if (!canvas) return;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: MouseEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      userYaw.current -= dx * LOOK_SENSITIVITY;
      userPitch.current = THREE.MathUtils.clamp(
        userPitch.current - dy * LOOK_SENSITIVITY,
        -PITCH_LIMIT,
        PITCH_LIMIT,
      );
    };
    const onUp = () => {
      dragging = false;
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      dragging = false;
    };
  }, [mode]);

  // Compute the guided target whenever the concept changes, and reset the
  // learner's free-look offset back to the curated framing.
  useEffect(() => {
    if (mode !== 'guided') return;
    const c = TERRAIN_CONCEPTS[guidedIndex];
    if (!c) return;
    const vy = getHeight(c.view.x, c.view.z) + EYE_HEIGHT;
    targetPos.current.set(c.view.x, vy, c.view.z);
    const ly = getHeight(c.position.x, c.position.z) + 4;
    aim.current.position.copy(targetPos.current);
    aim.current.up.set(0, 1, 0);
    aim.current.lookAt(c.position.x, ly, c.position.z);
    baseQuat.current.copy(aim.current.quaternion);
    userYaw.current = 0;
    userPitch.current = 0;
  }, [mode, guidedIndex]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);

    if (mode === 'guided') {
      const k = 1 - Math.exp(-2.8 * dt); // smooth ease toward the viewpoint
      camera.position.lerp(targetPos.current, k);
      lookEuler.current.set(userPitch.current, userYaw.current, 0);
      lookQuat.current.setFromEuler(lookEuler.current);
      targetQuat.current.copy(baseQuat.current).multiply(lookQuat.current);
      camera.quaternion.slerp(targetQuat.current, k);
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
