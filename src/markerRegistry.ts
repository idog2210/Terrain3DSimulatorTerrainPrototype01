import type { Object3D } from 'three';
import type { ConceptId } from './utils/terrainTypes';

/**
 * Live registry of marker hit-targets in the scene. TerrainMarkers register
 * their clickable mesh here on mount; the FirstPersonController raycasts against
 * `markerObjects` from the crosshair so concepts can be selected by gaze while
 * the pointer is locked (no DOM cursor available in that mode).
 *
 * `markerObjects` is kept in sync so the controller can pass a stable array to
 * raycaster.intersectObjects() without allocating a new array every frame.
 */
export interface MarkerEntry {
  id: ConceptId;
  object: Object3D;
}

export const markerRegistry: MarkerEntry[] = [];
export const markerObjects: Object3D[] = [];

export function registerMarker(entry: MarkerEntry): void {
  markerRegistry.push(entry);
  markerObjects.push(entry.object);
}

export function unregisterMarker(object: Object3D): void {
  const i = markerRegistry.findIndex((m) => m.object === object);
  if (i !== -1) markerRegistry.splice(i, 1);
  const j = markerObjects.indexOf(object);
  if (j !== -1) markerObjects.splice(j, 1);
}
