import * as THREE from 'three';
import { fbm } from './noise';

/**
 * Builds a noise-displaced icosahedron: lumpy and irregular rather than a
 * perfect geometric solid. Shared by every rock-like scatter (boulders,
 * pebbles, debris) so they all read as the same material/shape language at
 * different scales and detail levels.
 */
export interface RockGeometryOptions {
  /** Icosahedron subdivision level — higher is smoother/more detailed and costlier per instance. */
  detail?: number;
  frequency?: number;
  radiusBase?: number;
  radiusAmplitude?: number;
  /** Vertical squash factor (1 = round, lower = flatter/chip-like). */
  ySquash?: number;
}

export function makeRockGeometry(seed: number, opts: RockGeometryOptions = {}): THREE.BufferGeometry {
  const { detail = 3, frequency = 1.7, radiusBase = 0.72, radiusAmplitude = 0.56, ySquash = 0.8 } = opts;
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let d = fbm(v.x * frequency + seed, v.y * frequency + seed * 0.3);
    d += fbm(v.y * frequency - seed, v.z * frequency + seed * 0.7) * 0.6;
    d += fbm(v.z * frequency + seed * 1.3, v.x * frequency - seed) * 0.4;
    d /= 2;
    const r = radiusBase + d * radiusAmplitude;
    pos.setXYZ(i, v.x * r, v.y * r * ySquash, v.z * r);
  }
  geo.computeVertexNormals();
  return geo;
}
