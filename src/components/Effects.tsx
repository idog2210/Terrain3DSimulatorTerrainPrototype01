import {
  EffectComposer,
  N8AO,
  Bloom,
  ToneMapping,
  Vignette,
  Noise,
  DepthOfField,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useSimStore } from '../store';

/**
 * Cinematic post-processing. Order matters:
 *   N8AO (contact AO) → Bloom (HDR highlights only) → [DOF in demo] →
 *   ToneMapping (ACES — the composer disables the renderer's own) →
 *   Vignette → film grain.
 * Kept restrained so it reads as a professional terrain visualization, not a
 * gamey filter stack. Bloom is luminance-gated so it touches the glowing markers
 * and the brightest sun highlights, not the diffuse terrain.
 */
export default function Effects() {
  const demo = useSimStore((s) => s.mode === 'demo');

  return (
    <EffectComposer multisampling={4} depthBuffer>
      <N8AO
        aoRadius={2.4}
        distanceFalloff={1}
        intensity={0.45}
        quality="medium"
        halfRes
        depthAwareUpsampling
        color="#241d12"
      />
      <Bloom
        luminanceThreshold={1.05}
        luminanceSmoothing={0.16}
        intensity={0.5}
        mipmapBlur
        radius={0.7}
        levels={6}
      />
      {demo ? (
        <DepthOfField worldFocusDistance={95} worldFocusRange={90} bokehScale={1.3} />
      ) : (
        <></>
      )}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.32} darkness={0.32} blendFunction={BlendFunction.NORMAL} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.022} />
    </EffectComposer>
  );
}
