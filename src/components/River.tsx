import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getRiverChannel } from '../utils/waterChannel';

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
 * layers on: flow-mapped ripples (three octaves, the finest matched to the
 * grain scale the terrain/rocks/trees get from their real normal-map
 * textures) that scroll downstream at that per-rib speed, bank + fast-water
 * + current-line foam, a boosted envMapIntensity plus a Fresnel roughness
 * term for near-mirror grazing-angle reflections, a sun-glint sparkle layer,
 * and a deep/shallow/wet-bed color gradient driven by the real per-vertex
 * channel depth computed in buildRiverGeometry (not a UV-position guess).
 */

function buildRiverGeometry(): THREE.BufferGeometry {
  const {
    steps,
    centers,
    normals,
    halfWidths,
    flowSpeeds,
    leftHeights: leftSmoothed,
    rightHeights: rightSmoothed,
    centerGround: centerRaw,
  } = getRiverChannel();

  // Real per-rib channel depth: how far the (already-carved) centerline bed
  // sits below the water line, using the higher bank as the water-line
  // reference. This is genuine geometry, not a UV-space guess — it deepens
  // through real pools/carved stretches and shallows out toward the tapered
  // ends, and drives the fragment shader's color/alpha/foam below instead of
  // a fake distance-from-centerline blend.
  const depths = centerRaw.map((hCenter, i) =>
    Math.max(0.05, Math.max(leftSmoothed[i], rightSmoothed[i]) - hCenter),
  );

  const positions: number[] = [];
  const uvs: number[] = [];
  const flowSpeedAttr: number[] = [];
  const depthAttr: number[] = [];
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
    depthAttr.push(depths[i], depths[i]);

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
  geo.setAttribute('aDepth', new THREE.Float32BufferAttribute(depthAttr, 1));
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
    // A wet, reflective surface should lean on the scene's IBL probe more
    // than the matte terrain/rock/tree materials around it do (their default
    // is 1) — this is the main lever making the water read as reflective
    // rather than flat-shaded, without a new reflection pass.
    envMapIntensity: 1.45,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    material.userData.shader = shader;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        'attribute vec2 aRiverUv;\nattribute float aFlowSpeed;\nattribute float aDepth;\nvarying vec2 vWaterUv;\nvarying float vFlowSpeed;\nvarying float vDepth;\nvarying vec3 vWPos;\nvarying vec3 vWNormal;\nuniform float uTime;\n#include <common>',
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
  vDepth = aDepth;
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
        `varying vec2 vWaterUv;\nvarying float vFlowSpeed;\nvarying float vDepth;\nvarying vec3 vWPos;\nvarying vec3 vWNormal;\nuniform float uTime;\n${WATER_NOISE_GLSL}\n#include <common>`,
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
  // A finer third octave, matched to the pixel-grain scale a real normal-map
  // texture would give the terrain/rocks/trees — keeps the water from
  // reading smoother/flatter than everything else built from photographic
  // PBR maps.
  vec2 uvC = vWaterUv * vec2(11.0, 46.0) + vec2(flow * 0.11, flow * 2.1) + 23.4;
  float n3 = wNoise(uvC);
  offset += (n3 - 0.5) * 0.035;
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
  // Real depth cue: vDepth is genuine carved-bed-to-water-line distance from
  // the geometry (varies with actual pools/riffles along the channel), not a
  // guess from UV position. Combined with the cross-section shape (still
  // deepest at the centerline, shoaling toward the banks) it drives color,
  // alpha and how much the streambed itself bleeds through in shallow water —
  // the things a real shallow mountain stream actually shows.
  float edge = abs(vWaterUv.x - 0.5) * 2.0;
  float crossSection = 1.0 - edge * edge;
  float depthNorm = clamp(vDepth / 1.8, 0.0, 1.0);
  float depthShape = clamp(crossSection * depthNorm * 1.3, 0.0, 1.0);

  vec3 deep = vec3(0.03, 0.13, 0.16);
  vec3 shallow = vec3(0.22, 0.4, 0.38);
  vec3 wetBed = vec3(0.33, 0.32, 0.24); // damp streambed showing through where it's genuinely thin
  vec3 base = mix(shallow, deep, depthShape);
  diffuseColor.rgb = mix(wetBed, base, smoothstep(0.0, 0.22, depthShape));
  diffuseColor.a = mix(0.4, 0.94, depthShape);

  // Foam: along the banks, streaked through fast (narrow) stretches, thin
  // current lines that run the length of the channel so the flow direction
  // reads at a glance, and more of all three where the water runs genuinely
  // shallow (real streams foam over shoals/riffles, not over still pools).
  float flow = uTime * vFlowSpeed;
  float shallowBoost = mix(1.6, 0.8, depthNorm);
  float foamNoise = wNoise(vWaterUv * vec2(4.5, 24.0) + vec2(flow * 0.06, flow * 1.05));
  float bankFoam = smoothstep(0.72, 1.0, edge) * smoothstep(0.35, 0.7, foamNoise);
  float speedFoam = smoothstep(1.15, 1.6, vFlowSpeed) * smoothstep(0.5, 0.85, foamNoise);
  float streakNoise = wNoise(vWaterUv * vec2(1.6, 50.0) + vec2(0.0, flow * 1.6));
  float streakFoam = smoothstep(0.64, 0.82, streakNoise) * 0.5;
  float foam = clamp((bankFoam + speedFoam + streakFoam) * shallowBoost, 0.0, 1.0);
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

  material.customProgramCacheKey = () => 'river-water-v4';
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
