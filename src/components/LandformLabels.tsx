import { Html } from '@react-three/drei';
import { TERRAIN_CONCEPTS } from '../data/terrainConcepts';
import { getHeight } from '../utils/terrainHeight';
import { useSimStore } from '../store';

/**
 * Always-on-top text labels naming each landform, floating above the terrain.
 * Toggled by the "Landform labels" layer. They are click-through (the clickable
 * beacons are the TerrainMarkers) and scale with distance for depth.
 */
export default function LandformLabels({ visible }: { visible: boolean }) {
  const lang = useSimStore((s) => s.lang);
  if (!visible) return null;

  return (
    <>
      {TERRAIN_CONCEPTS.map((c) => (
        <Html
          key={c.id}
          position={[c.position.x, getHeight(c.position.x, c.position.z) + 7, c.position.z]}
          center
          distanceFactor={30}
          zIndexRange={[20, 0]}
          pointerEvents="none"
          wrapperClass="landform-html"
        >
          <span className="landform-label">{c.title[lang]}</span>
        </Html>
      ))}
    </>
  );
}
