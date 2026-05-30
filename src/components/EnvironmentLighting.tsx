import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, Lightformer } from '@react-three/drei';

/**
 * Atmosphere and image-based lighting for a warm, late-afternoon dry-terrain
 * field-survey mood:
 *   - drei <Sky> for the visible atmospheric sky + horizon haze
 *   - a fully PROCEDURAL <Environment> (Lightformers, no external HDR files) for
 *     soft image-based ambient/specular fill — keeps it offline-safe
 *   - a strong warm directional sun for shadows
 *   - a little ambient so shadows never crush to black
 * Tone mapping is handled by the post-processing ToneMapping effect (the
 * EffectComposer forces NoToneMapping on the renderer), so exposure lives there.
 */

const SUN: [number, number, number] = [92, 60, 46];

/** The scene is static from the sun's POV, so render the shadow map only at startup. */
function StaticShadowOnce() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl]);
  useFrame(() => {
    if (frames.current < 5) {
      gl.shadowMap.needsUpdate = true;
      frames.current += 1;
    }
  });
  return null;
}

export default function EnvironmentLighting() {
  return (
    <>
      <color attach="background" args={['#aebccd']} />
      {/* Subtle aerial perspective: distant ridge fades into the haze. */}
      <fogExp2 attach="fog" args={['#c2cedb', 0.0026]} />

      <Sky
        distance={4500}
        sunPosition={SUN}
        turbidity={7}
        rayleigh={1.9}
        mieCoefficient={0.005}
        mieDirectionalG={0.86}
      />

      {/* Procedural image-based lighting — no external assets, rendered once. */}
      <Environment frames={0} resolution={256} environmentIntensity={0.7}>
        {/* warm sun key */}
        <Lightformer
          form="circle"
          intensity={2.2}
          color="#ffe4bd"
          scale={6}
          position={[20, 16, -12]}
          target={[0, 0, 0]}
        />
        {/* cool sky dome fill */}
        <Lightformer
          form="rect"
          intensity={0.7}
          color="#acc4e0"
          scale={[60, 30, 1]}
          position={[0, 30, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        {/* warm ground bounce */}
        <Lightformer
          form="rect"
          intensity={0.35}
          color="#6b5a3e"
          scale={[60, 30, 1]}
          position={[0, -8, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      </Environment>

      {/* Generous fill so shadowed + occluded ground (e.g. the stream channel)
          stays readable and never reads as black. */}
      <ambientLight intensity={0.28} />
      <hemisphereLight args={['#cfdae6', '#7a6b50', 0.5]} />

      {/* The sun: warm directional key with soft shadows covering the terrain. */}
      <directionalLight
        position={SUN}
        intensity={2.6}
        color="#ffe7c8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
        shadow-radius={3}
        shadow-camera-near={1}
        shadow-camera-far={400}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
      />

      <StaticShadowOnce />
    </>
  );
}
