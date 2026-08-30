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

function buildRiverGeometry(): THREE.BufferGeometry {
  const controlPoints = STREAM_PATH.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.4);
  const steps = (STREAM_PATH.length - 1) * SEGMENTS_PER_SPAN;

  const centers: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = curve.getPoint(i / steps);
    p.y = getHeight(p.x, p.z) + 0.08;
    centers.push(p);
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = centers[i];
    const prev = centers[Math.max(0, i - 1)];
    const next = centers[Math.min(steps, i + 1)];
    const tangent = new THREE.Vector3().subVectors(next, prev);
    tangent.y = 0;
    if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
    tangent.normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

    const taper = smoothstep01(0, 0.06, t) * (1 - smoothstep01(0.94, 1, t));
    const halfWidth = (BASE_WIDTH * 0.5) * Math.max(0.05, taper);

    const left = p.clone().addScaledVector(normal, halfWidth);
    const right = p.clone().addScaledVector(normal, -halfWidth);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(0, t * steps * 0.35, 1, t * steps * 0.35);

    if (i > 0) {
      const a = (i - 1) * 2;
      const b = i * 2;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
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
  normal.xz += (vec2(rip, rip2) - 0.5) * 0.12;
  normal = normalize(normal);
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
