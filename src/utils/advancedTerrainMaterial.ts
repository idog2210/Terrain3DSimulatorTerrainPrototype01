import * as THREE from 'three';
import type { PBRSet } from './useOptionalTextures';

/**
 * The terrain's PBR material. It extends MeshStandardMaterial (so it keeps real
 * shadows, image-based lighting, fog and tone-mapping integration) and layers
 * art-directed detail on top via onBeforeCompile:
 *   - keeps the per-vertex palette (elevation/slope/macro-tint from the mesh)
 *   - world-space procedural color break-up (broad patches + fine grain) so the
 *     ground is never flat or monotone
 *   - fragment-level slope→rock blending (crisp exposed rock on steep faces,
 *     beyond what per-vertex resolution can show)
 *   - roughness variation (patches catch the light differently)
 * Optional local PBR textures (albedo/normal/roughness) are multiplied in when
 * present; otherwise the procedural appearance stands on its own.
 */

const VARYINGS = 'varying vec3 vWPos;\nvarying vec3 vWNormal;\n';

const NOISE_GLSL = /* glsl */ `
float tHash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float tNoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = tHash(i), b = tHash(i + vec2(1.0, 0.0));
  float c = tHash(i + vec2(0.0, 1.0)), d = tHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float tFbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ s += a * tNoise(p); p *= 2.0; a *= 0.5; } return s; }
`;

const COLOR_BLOCK = /* glsl */ `
{
  float macro = tFbm(vWPos.xz * 0.05);
  float micro = tFbm(vWPos.xz * 0.45 + 19.0);
  float vv = (0.84 + macro * 0.30) * (0.93 + micro * 0.13);
  diffuseColor.rgb *= vv;
  float drift = macro - 0.5;
  diffuseColor.rgb *= vec3(1.0 + drift * 0.07, 1.0 + drift * 0.01, 1.0 - drift * 0.06);
  // crisp exposed rock on steep fragments (kept light enough to stay readable)
  float fslope = 1.0 - clamp(vWNormal.y, 0.0, 1.0);
  float rockW = smoothstep(0.36, 0.66, fslope) * 0.38;
  vec3 rockCol = vec3(0.3, 0.29, 0.27) * (0.92 + micro * 0.3);
  diffuseColor.rgb = mix(diffuseColor.rgb, rockCol, rockW);
}
`;

const ROUGH_BLOCK = /* glsl */ `
{
  float rn = tFbm(vWPos.xz * 0.32 + 7.0);
  float fslope2 = 1.0 - clamp(vWNormal.y, 0.0, 1.0);
  roughnessFactor = clamp(roughnessFactor - 0.12 + rn * 0.22 + smoothstep(0.34, 0.64, fslope2) * 0.15, 0.5, 1.0);
}
`;

const MAP_BREAKUP = /* glsl */ `
#ifdef USE_MAP
  vec2 uvA = vMapUv;
  float mrot = 2.4;
  float mcos = cos(mrot);
  float msin = sin(mrot);
  vec2 mcentered = uvA - 0.5;
  vec2 uvB = vec2(
    mcentered.x * mcos - mcentered.y * msin,
    mcentered.x * msin + mcentered.y * mcos
  ) + 0.5 + vec2(37.2, 11.7);
  vec4 sampledDiffuseColorA = texture2D( map, uvA );
  vec4 sampledDiffuseColorB = texture2D( map, uvB );
  float blendN = tFbm(vWPos.xz * 0.015 + 100.0);
  vec4 sampledDiffuseColor = mix(sampledDiffuseColorA, sampledDiffuseColorB, smoothstep(0.35, 0.65, blendN));
  diffuseColor *= sampledDiffuseColor;
#endif
`;

export function createAdvancedTerrainMaterial(tex: PBRSet | null): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
  });

  if (tex) {
    if (tex.map) material.map = tex.map;
    if (tex.normalMap) {
      material.normalMap = tex.normalMap;
      material.normalScale = new THREE.Vector2(0.8, 0.8);
    }
    if (tex.roughnessMap) material.roughnessMap = tex.roughnessMap;
  }

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', VARYINGS + '#include <common>')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\n  vWNormal = normalize(mat3(modelMatrix) * objectNormal);',
      );

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', NOISE_GLSL + VARYINGS + '#include <common>')
      .replace('#include <map_fragment>', MAP_BREAKUP)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + COLOR_BLOCK)
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\n' + ROUGH_BLOCK,
      );
  };

  material.customProgramCacheKey = () => 'advanced-terrain-v3';
  return material;
}
