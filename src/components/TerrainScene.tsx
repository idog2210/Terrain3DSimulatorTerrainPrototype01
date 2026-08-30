import { PointerLockControls } from '@react-three/drei';
import EnvironmentLighting from './EnvironmentLighting';
import ProceduralTerrain from './ProceduralTerrain';
import ImprovedRocks from './ImprovedRocks';
import GroundDetails from './GroundDetails';
import River from './River';
import Trees from './Trees';
import ContourLines from './ContourLines';
import LandformLabels from './LandformLabels';
import TerrainMarker from './TerrainMarker';
import FirstPersonController from './FirstPersonController';
import CameraDirector from './CameraDirector';
import DemoCameraTour from './DemoCameraTour';
import Effects from './Effects';
import { TERRAIN_CONCEPTS } from '../data/terrainConcepts';
import { useSimStore } from '../store';

/**
 * The 3D scene graph (everything inside the Canvas): atmosphere + image-based
 * lighting, the PBR terrain, rocks and ground detail, the toggleable analysis
 * layers, the educational markers, the camera driver for the current mode, and
 * the cinematic post-processing stack:
 *   - free  → first-person controller + pointer-lock mouse-look
 *   - guided/demo → scripted CameraDirector (no pointer lock)
 */
export default function TerrainScene() {
  const layers = useSimStore((s) => s.layers);
  const mode = useSimStore((s) => s.mode);
  const started = useSimStore((s) => s.started);
  const freeMode = started && mode === 'free';

  return (
    <>
      <EnvironmentLighting />
      <ProceduralTerrain />
      <ImprovedRocks />
      <GroundDetails />
      <River />
      <Trees />

      <ContourLines visible={layers.contours} />
      <LandformLabels visible={layers.labels} />

      {TERRAIN_CONCEPTS.map((c) => (
        <TerrainMarker key={c.id} concept={c} />
      ))}

      {freeMode && (
        <>
          <FirstPersonController />
          {/* Scope the lock trigger to the canvas so panel clicks don't re-lock. */}
          <PointerLockControls selector=".app canvas" />
        </>
      )}
      {started && mode === 'guided' && <CameraDirector />}
      {started && mode === 'demo' && <DemoCameraTour />}

      <Effects />
    </>
  );
}
