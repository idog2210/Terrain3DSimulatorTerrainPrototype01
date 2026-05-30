import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  TERRAIN_SIZE,
  TERRAIN_SEGMENTS,
  getHeight,
  terrainColor,
  slopeHeatColor,
  colorTint,
} from '../utils/terrainHeight';
import { CONCEPTS_BY_ID } from '../data/terrainConcepts';
import { createAdvancedTerrainMaterial } from '../utils/advancedTerrainMaterial';
import { useOptionalPBR } from '../utils/useOptionalTextures';
import { useSimStore } from '../store';

/**
 * The terrain mesh. A subdivided plane is displaced by getHeight() and shaded
 * with per-vertex colors:
 *   - natural mode: soil / dry grass / earth / rock by elevation & slope
 *   - slope layer:  a steepness heat-map (cool = flat, warm = steep)
 * The currently selected concept's area is washed with its warm accent color.
 */
export default function ProceduralTerrain() {
  const slopeLayer = useSimStore((s) => s.layers.slope);
  const selectedId = useSimStore((s) => s.selectedId);

  // Build the geometry and the color sets exactly once (deterministic).
  const { geometry, natural, naturalTextured, slopeCols, positions, count } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      TERRAIN_SIZE,
      TERRAIN_SIZE,
      TERRAIN_SEGMENTS,
      TERRAIN_SEGMENTS,
    );
    geo.rotateX(-Math.PI / 2); // lay flat: vertices become (x, 0, z)

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    for (let i = 0; i < n; i++) {
      pos.setY(i, getHeight(pos.getX(i), pos.getZ(i)));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const nrm = geo.attributes.normal as THREE.BufferAttribute;
    const nat = new Float32Array(n * 3);
    const natTex = new Float32Array(n * 3); // softened zonal tint, used over a real albedo
    const slope = new Float32Array(n * 3);
    // The palette is authored in sRGB; convert to linear before writing the
    // vertex buffer so lighting is physically correct (the shader treats vertex
    // colors as linear and re-encodes to sRGB on output).
    const tmp = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const y = pos.getY(i);
      const ny = nrm.getY(i);
      const slope01 = Math.acos(ny < -1 ? -1 : ny > 1 ? 1 : ny) / (Math.PI / 2);
      const cn = terrainColor(y, slope01, colorTint(pos.getX(i), pos.getZ(i)));
      tmp.setRGB(cn.r, cn.g, cn.b, THREE.SRGBColorSpace);
      nat[o] = tmp.r;
      nat[o + 1] = tmp.g;
      nat[o + 2] = tmp.b;
      // Lift each toward neutral so it tints (not darkens) the albedo texture.
      natTex[o] = tmp.r + (0.8 - tmp.r) * 0.6;
      natTex[o + 1] = tmp.g + (0.8 - tmp.g) * 0.6;
      natTex[o + 2] = tmp.b + (0.8 - tmp.b) * 0.6;
      const cs = slopeHeatColor(slope01);
      tmp.setRGB(cs.r, cs.g, cs.b, THREE.SRGBColorSpace);
      slope[o] = tmp.r;
      slope[o + 1] = tmp.g;
      slope[o + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nat), 3));
    return {
      geometry: geo,
      natural: nat,
      naturalTextured: natTex,
      slopeCols: slope,
      positions: pos.array as Float32Array,
      count: n,
    };
  }, []);

  // Textures (optional, from /public/textures/terrain). Declared before the
  // color effect so it can pick the texture-friendly tint palette.
  const tex = useOptionalPBR('/textures/terrain/', 48);
  const hasAlbedo = !!(tex && tex.map);

  // Recompute the active vertex colors when the layer or selection changes.
  useEffect(() => {
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const arr = colorAttr.array as Float32Array;
    arr.set(slopeLayer ? slopeCols : hasAlbedo ? naturalTextured : natural);

    const concept = selectedId ? CONCEPTS_BY_ID[selectedId] : null;
    if (concept) {
      // Accent hex is sRGB -> linear via THREE.Color, matching the linear buffer.
      const col = new THREE.Color(concept.accent);
      const R = 12; // tighter radius — a subtle warm glow, not a paint blob
      const cx = concept.position.x;
      const cz = concept.position.z;
      for (let i = 0; i < count; i++) {
        const dx = positions[i * 3] - cx;
        const dz = positions[i * 3 + 2] - cz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < R) {
          const t = 1 - d / R;
          const k = t * t * 0.3;
          const o = i * 3;
          arr[o] += (col.r - arr[o]) * k;
          arr[o + 1] += (col.g - arr[o + 1]) * k;
          arr[o + 2] += (col.b - arr[o + 2]) * k;
        }
      }
    }
    colorAttr.needsUpdate = true;
  }, [slopeLayer, selectedId, geometry, natural, naturalTextured, hasAlbedo, slopeCols, positions, count]);

  const material = useMemo(() => createAdvancedTerrainMaterial(tex), [tex]);

  // Dispose a superseded material when textures resolve and replace it (never
  // the live one, so it is StrictMode-safe).
  const prevMaterial = useRef<THREE.Material | null>(null);
  useEffect(() => {
    if (prevMaterial.current && prevMaterial.current !== material) {
      prevMaterial.current.dispose();
    }
    prevMaterial.current = material;
  }, [material]);

  return (
    <mesh geometry={geometry} receiveShadow castShadow frustumCulled={false}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}
