import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { STREAM_PATH, getHeight } from '../utils/terrainHeight';
import { fbm } from '../utils/noise';

/**
 * The river: a ribbon mesh following STREAM_PATH (a meandering multi-point
 * curve, not a straight line), sampling terrain height at each bank
 * independently so the water surface follows the channel's real cross-slope
 * instead of sitting as one forced-flat plane — that flat-plane shortcut was
 * what left banks floating above their own ground on any cross-slope. Width
 * tapers in/out at the path ends and drifts slightly along the way (natural
 * narrows/pools), which also drives a per-rib flow speed by continuity
 * (narrow = faster).
 * A water shader (same onBeforeCompile technique as advancedTerrainMaterial.ts)
 * layers on: flow-mapped ripples that scroll downstream at that per-rib
 * speed, bank + fast-water foam, a Fresnel roughness term for near-mirror
 * grazing-angle reflections, and a deep/shallow color gradient across the
 * width.
 */

const SEGMENTS_PER_SPAN = 14;
const BASE_WIDTH = 3.4;

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Vertical clearance each bank vertex keeps above the terrain sampled right
// beneath it. Small, because the terrain's own fine noise is already damped
// near the stream (see `bedDamp` in getHeight) — this only needs to cover
// the residual left after that plus the 3-tap smoothing below.
const WATER_CLEARANCE = 0.25;

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
  // Per-rib flow speed: slow fbm narrows/widens the channel a little (natural
  // pools and riffles, well inside the wider carved channel so banks never
  // clip) and speed follows from width by continuity — a narrow rib flows
  // faster than a wide one, same as a real stream.
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

  // Height per bank: sample each edge of the cross-section independently and
  // let the water surface follow the real cross-slope of the channel bed,
  // instead of forcing both banks to the height of whichever side is
  // highest. That flat-plane-at-the-max approach was the actual cause of
  // banks floating visibly above their own ground on any cross-slope (up to
  // ~2 m on this terrain) — raising the low bank to match the high one. Each
  // edge is still guarded against the centerline bumping up between them
  // (so a mid-channel rise can't poke through the strip joining the two
  // banks), just not against the *other* edge.
  const leftHeights: number[] = [];
  const rightHeights: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = centers[i];
    const normal = normals[i];
    const hw = halfWidths[i];
    const hCenter = getHeight(p.x, p.z);
    const hLeft = getHeight(p.x + normal.x * hw, p.z + normal.z * hw);
    const hRight = getHeight(p.x - normal.x * hw, p.z - normal.z * hw);
    leftHeights.push(Math.max(hLeft, hCenter) + WATER_CLEARANCE);
    rightHeights.push(Math.max(hRight, hCenter) + WATER_CLEARANCE);
  }

  // Light smoothing along the flow direction (not across the width) to damp
  // residual fine-noise bumps between neighboring ribs, per bank.
  const smooth3 = (arr: number[]) =>
    arr.map((h, i) => {
      const prev = arr[Math.max(0, i - 1)];
      const next = arr[Math.min(steps, i + 1)];
      return (prev + h + next) / 3;
    });
  const leftSmoothed = smooth3(leftHeights);
  const rightSmoothed = smooth3(rightHeights);

  const positions: number[] = [];
  const uvs: number[] = [];
  const flowSpeedAttr: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = centers[i];
    const normal = normals[i];
    const halfWidth = halfWidths[i];

    const left = p.clone().addScaledVector(normal, halfWidth);
    left.y = leftSmoothed[i];
    const right = p.clone().addScaledVector(normal, -halfWidth);
    right.y = rightSmoothed[i];
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(0, t * steps * 0.35, 1, t * steps * 0.35);
    flowSpeedAttr.push(flowSpeeds[i], flowSpeeds[i]);

    if (i > 0) {
      const a = (i - 1) * 2;
      const b = i * 2;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aRiverUv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aFlowSpeed', new THREE.Float32BufferAttribute(flowSpeedAttr, 1));
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
      .replace(
        '#include <common>',
        'attribute vec2 aRiverUv;\nattribute float aFlowSpeed;\nvarying vec2 vWaterUv;\nvarying float vFlowSpeed;\nvarying vec3 vWPos;\nvarying vec3 vWNormal;\nuniform float uTime;\n#include <common>',
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\n  vWNormal = normalize(mat3(modelMatrix) * objectNormal);',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  vWaterUv = aRiverUv;
  vFlowSpeed = aFlowSpeed;
  // Gentle traveling surface wave, downstream (vWaterUv.y) and time driven,
  // scaled a few cm so it reads as motion without reintroducing bank
  // floating/intrusion — the base height above is already correct per-vertex.
  float wave = sin(vWaterUv.y * 0.9 - uTime * vFlowSpeed * 2.2) * 0.05
    + sin(vWaterUv.y * 2.3 - uTime * vFlowSpeed * 3.6 + 1.7) * 0.02;
  transformed.y += wave;
  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `varying vec2 vWaterUv;\nvarying float vFlowSpeed;\nvarying vec3 vWPos;\nvarying vec3 vWNormal;\nuniform float uTime;\n${WATER_NOISE_GLSL}\n#include <common>`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
{
  // Water optics: near-mirror at grazing angles, more diffuse looking straight down.
  vec3 viewDir = normalize(cameraPosition - vWPos);
  float fresnel = pow(1.0 - clamp(dot(viewDir, normalize(vWNormal)), 0.0, 1.0), 4.0);
  roughnessFactor = mix(roughnessFactor, 0.05, fresnel * 0.85);
}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  // Two flow-mapped ripple layers scrolling downstream (vWaterUv.y) at a rate
  // set by vFlowSpeed, so ripples visibly stream with the current instead of
  // just jittering in place; narrower/faster ribs get a bit choppier too.
  float turb = mix(0.85, 1.6, smoothstep(0.6, 1.6, vFlowSpeed));
  float flow = uTime * vFlowSpeed;
  vec2 uvA = vWaterUv * vec2(2.4, 9.0) * turb + vec2(flow * 0.04, flow * 0.85);
  vec2 uvB = vWaterUv * vec2(4.0, 15.0) * turb - vec2(flow * 0.03, flow * 1.3) + 5.0;
  float n1 = wNoise(uvA);
  float n2 = wNoise(uvB);
  vec2 offset = (vec2(n1, n2) - 0.5) * vec2(0.075, 0.2) * turb;
  // normalMatrix is a vertex-only uniform in this build, so perturb the
  // world-space normal (vWNormal) and re-project to view space with
  // viewMatrix, which — unlike normalMatrix — is available here too.
  vec3 rippledWorldNormal = normalize(vWNormal + vec3(offset.x, 0.0, offset.y));
  normal = normalize(mat3(viewMatrix) * rippledWorldNormal);
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

  // Foam: along the banks, streaked through fast (narrow) stretches, and thin
  // current lines that run the length of the channel so the flow direction
  // reads at a glance even in calm, wide stretches.
  float flow = uTime * vFlowSpeed;
  float foamNoise = wNoise(vWaterUv * vec2(4.5, 24.0) + vec2(flow * 0.06, flow * 1.05));
  float bankFoam = smoothstep(0.72, 1.0, edge) * smoothstep(0.35, 0.7, foamNoise);
  float speedFoam = smoothstep(1.15, 1.6, vFlowSpeed) * smoothstep(0.5, 0.85, foamNoise);
  float streakNoise = wNoise(vWaterUv * vec2(1.6, 50.0) + vec2(0.0, flow * 1.6));
  float streakFoam = smoothstep(0.64, 0.82, streakNoise) * 0.5;
  float foam = clamp(bankFoam + speedFoam + streakFoam, 0.0, 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.88, 0.86), foam * 0.7);
  diffuseColor.a = max(diffuseColor.a, foam * 0.85);
}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
{
  // Sun-glint: sparse, bright sparkle that drifts downstream with the
  // current, brightest at grazing/reflective angles — reads as sunlight
  // catching moving ripples. Additive (emissive), so it stays visible
  // regardless of light direction, like the rest of this water's optics.
  float flow = uTime * vFlowSpeed;
  vec2 glintUv = vWaterUv * vec2(6.0, 30.0) + vec2(flow * 0.05, flow * 1.15);
  float g1 = wNoise(glintUv);
  float g2 = wNoise(glintUv * 1.7 + 11.3);
  float glint = smoothstep(0.62, 0.95, g1 * g2 * 1.6);
  vec3 viewDirGlint = normalize(cameraPosition - vWPos);
  float glintFresnel = pow(1.0 - clamp(dot(viewDirGlint, normalize(vWNormal)), 0.0, 1.0), 2.0);
  float glintVisibility = mix(0.4, 1.0, glintFresnel);
  totalEmissiveRadiance += vec3(1.0, 0.97, 0.87) * glint * glintVisibility * 1.3;
}`,
      );
  };

  material.customProgramCacheKey = () => 'river-water-v3';
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
