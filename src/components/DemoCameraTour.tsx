import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { getHeight } from '../utils/terrainHeight';
import { playerPose } from '../playerPose';

/**
 * Hands-free cinematic tour shown behind the onboarding screen: the camera
 * eases between a set of curated scenic viewpoints — the opening ridge vista,
 * down the valley, along the stream, the rocky flank, and the saddle —
 * looping continuously.
 */

interface Waypoint {
  // camera ground position + height offset, and a look-at ground point + offset
  px: number;
  pz: number;
  py: number;
  lx: number;
  lz: number;
  ly: number;
}

const WAYPOINTS: Waypoint[] = [
  { px: 6, pz: 90, py: 7, lx: -2, lz: -70, ly: 14 }, // opening ridge vista
  { px: 8, pz: 46, py: 5, lx: 2, lz: -40, ly: 10 }, // down the valley into depth
  { px: 16, pz: 22, py: 3, lx: -4, lz: -64, ly: 12 }, // low along the stream
  { px: 34, pz: -34, py: 9, lx: 50, lz: -64, ly: 6 }, // toward the rocky flank
  { px: -16, pz: -34, py: 11, lx: -44, lz: -72, ly: 8 }, // hilltop profile
  { px: -2, pz: -42, py: 8, lx: -2, lz: -76, ly: 5 }, // the saddle
];

const SEG_SECONDS = 7;

export default function DemoCameraTour() {
  const camera = useThree((s) => s.camera);
  const t = useRef(0);
  const fwd = useRef(new THREE.Vector3());

  const path = useMemo(
    () =>
      WAYPOINTS.map((w) => ({
        pos: new THREE.Vector3(w.px, getHeight(w.px, w.pz) + w.py, w.pz),
        look: new THREE.Vector3(w.lx, getHeight(w.lx, w.lz) + w.ly, w.lz),
      })),
    [],
  );

  const tmpPos = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    t.current += Math.min(delta, 0.05);
    const n = path.length;
    const total = n * SEG_SECONDS;
    const tt = t.current % total;
    const seg = Math.floor(tt / SEG_SECONDS);
    const localRaw = (tt % SEG_SECONDS) / SEG_SECONDS;
    const local = localRaw * localRaw * (3 - 2 * localRaw); // ease in/out (settles at each viewpoint)
    const a = path[seg];
    const b = path[(seg + 1) % n];

    tmpPos.current.copy(a.pos).lerp(b.pos, local);
    tmpLook.current.copy(a.look).lerp(b.look, local);
    camera.position.copy(tmpPos.current);
    camera.lookAt(tmpLook.current);

    camera.getWorldDirection(fwd.current);
    playerPose.x = camera.position.x;
    playerPose.z = camera.position.z;
    playerPose.heading = Math.atan2(fwd.current.x, -fwd.current.z);
  });

  return null;
}
