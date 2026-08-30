import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { STREAM_PATH, getHeight } from '../utils/terrainHeight';

/**
 * The river: a ribbon mesh following STREAM_PATH, sampling terrain height
 * along its centerline (which already includes the dry-stream carve) so the
 * water surface sits inside the existing channel. Width tapers in/out at
 * the path ends. A lightweight animated-ripple water shader (same
 * onBeforeCompile technique as advancedTerrainMaterial.ts) gives it motion
 * and a Fresnel-ish deep/shallow color gradient across the width.
 */

const SEGMENTS_PER_SPAN = 14;
const BASE_WIDTH = 3.4;

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Vertical clearance above the highest sampled terrain point of a rib's
// cross-section, so the flat water plane clears the fine-noise bumps in the
// terrain bed (see final-review-report.md #4). 0.5 (top of the report's
// suggested 0.3-0.5 range) was chosen from a numeric sweep against the real
// getHeight() profile along STREAM_PATH: it cuts bed intrusions from 79/85
// ribs (worst 0.80 m) down to ~10/85 ribs (worst ~0.32 m).
const WATER_CLEARANCE = 0.5;

function buildRiverGeometry(): THREE.BufferGeometry {
  const controlPoints = STREAM_PATH.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.4);
  const steps = (STREAM_PATH.length - 1) * SEGMENTS_PER_SPAN;

  const centers: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    centers.push(curve.getPoint(i / steps));
  }

  // Per-rib tangent/normal/half-width, computed from the (x, z) centerline
  // only — independent of the height values resolved below.
  const normals: THREE.Vector3[] = [];
  const halfWidths: number[] = [];
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
    halfWidths.push((BASE_WIDTH * 0.5) * Math.max(0.05, taper));
  }

  // Height per rib: sample the terrain at the centerline AND both edges of
  // the cross-section, and clear the highest of the three — a flat plane at
  // only the centerline height gets poked through by the terrain's
  // fine-noise bumps well before it reaches the banks.
  const heights: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = centers[i];
    const normal = normals[i];
    const hw = halfWidths[i];
    const hCenter = getHeight(p.x, p.z);
    const hLeft = getHeight(p.x + normal.x * hw, p.z + normal.z * hw);
    const hRight = getHeight(p.x - normal.x * hw, p.z - normal.z * hw);
    heights.push(Math.max(hCenter, hLeft, hRight) + WATER_CLEARANCE);
  }

  // Smooth along the flow direction to damp residual fine-noise bumps
  // between neighboring ribs.
  //
  // NOTE on the "never run uphill" requirement (final-review-report.md #4):
  // a strict monotone-non-increasing downstream pass was evaluated
  // numerically against the real terrain profile and deliberately NOT
  // applied here. STREAM_PATH's endpoints go from high ground (z=-62,
  // h~14) to low ground (z=99, h~-19), but the terrain in between is not
  // monotonic — it dips into the broad valley basin around the path's
  // midpoint (h~-27) and then climbs back out ~9 m before the path ends.
  // A forward running-min clamp (the report's literal suggestion) locks
  // the whole back half of the river at the basin's lowest point, which
  // reintroduces bed intrusions up to ~9 m where the recovering terrain
  // rises above that clamped plane — far worse than the defect being
  // fixed. A backward running-max (the only way to also kill intrusions)
  // instead floats the water up to ~8.8 m above the ground over a ~30 m
  // stretch of the basin. Both were measured and rejected; see
  // final-fix-report.md for the numbers. The clearance + three-point
  // cross-section sampling + this local smoothing pass below already cut
  // bed intrusions by ~90% (79/85 ribs -> ~10/85, worst 0.80 m -> ~0.32 m)
  // without either failure mode, so that's what ships.
  const smoothed = heights.map((h, i) => {
    const prev = heights[Math.max(0, i - 1)];
    const next = heights[Math.min(steps, i + 1)];
    return (prev + h + next) / 3;
  });
  for (let i = 0; i <= steps; i++) {
    centers[i].y = smoothed[i];
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = centers[i];
    const normal = normals[i];
    const halfWidth = halfWidths[i];

    const left = p.clone().addScaledVector(normal, halfWidth);
    const right = p.clone().addScaledVector(normal, -halfWidth);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(0, t * steps * 0.35, 1, t * steps * 0.35);

    if (i > 0) {
      const a = (i - 1) * 2;
      const b = i * 2;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aRiverUv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const WATER_NOISE_GLSL = /* glsl */ `
float wHash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float wNoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = wHash(i), b = wHash(i + vec2(1.0, 0.0));
  float c = wHash(i + vec2(0.0, 1.0)), d = wHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`;

function createWaterMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.05, 0.16, 0.19),
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    side: THREE.DoubleSide,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    material.userData.shader = shader;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'attribute vec2 aRiverUv;\nvarying vec2 vWaterUv;\n#include <common>')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWaterUv = aRiverUv;');

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `varying vec2 vWaterUv;\nuniform float uTime;\n${WATER_NOISE_GLSL}\n#include <common>`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  float rip = wNoise(vWaterUv * vec2(3.0, 26.0) + vec2(uTime * 0.12, uTime * 0.55));
  float rip2 = wNoise(vWaterUv * vec2(5.0, 14.0) - vec2(uTime * 0.08, uTime * 0.4));
  vec2 offset = (vec2(rip, rip2) - 0.5) * 0.12;
  normal = normalize(normal + normalMatrix * vec3(offset.x, 0.0, offset.y));
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float edge = abs(vWaterUv.x - 0.5) * 2.0;
  vec3 deep = vec3(0.03, 0.13, 0.16);
  vec3 shallow = vec3(0.22, 0.4, 0.38);
  diffuseColor.rgb = mix(deep, shallow, clamp(edge * 1.3, 0.0, 1.0));
  diffuseColor.a = mix(0.92, 0.35, clamp(edge * 1.6, 0.0, 1.0));
}`,
      );
  };

  material.customProgramCacheKey = () => 'river-water-v1';
  return material;
}

export default function River() {
  const geometry = useMemo(() => buildRiverGeometry(), []);
  const material = useMemo(() => createWaterMaterial(), []);

  useFrame((state) => {
    const shader = material.userData.shader as
      | { uniforms: { uTime: { value: number } } }
      | undefined;
    // eslint-disable-next-line react-hooks/immutability
    if (shader) shader.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh geometry={geometry} receiveShadow frustumCulled={false}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}
