/** Shared domain types for the terrain simulator. */

/** Visualization layers that can be toggled from the UI. */
export type LayerKey = 'contours' | 'slope' | 'labels';

/** Identifiers for the educational terrain concepts. */
export type ConceptId =
  | 'hilltop'
  | 'ridge'
  | 'saddle'
  | 'slope'
  | 'valley'
  | 'stream'
  | 'rocky';

/** Supported interface languages. */
export type Lang = 'en' | 'he';

/** A string available in both interface languages. */
export type LocalizedText = Record<Lang, string>;

/** A point on the terrain in world XZ coordinates (Y is derived from getHeight). */
export interface Vec2 {
  x: number;
  z: number;
}

/** A clickable educational concept anchored to a real location on the terrain. */
export interface TerrainConcept {
  id: ConceptId;
  /** Landform name (also the marker caption). */
  title: LocalizedText;
  /** What the landform means. */
  meaning: LocalizedText;
  /** How to recognise it in the 3D terrain. */
  recognize: LocalizedText;
  /** How it appears on a topographic map. */
  mapView: LocalizedText;
  /** World XZ anchor; height is computed from the terrain function. */
  position: Vec2;
  /** Camera vantage point used by guided mode to frame this concept. */
  view: Vec2;
  /** Accent color (warm amber family) used to highlight the area. */
  accent: string;
}

/** Plain RGB triple in 0..1 space (used by the shared terrain color function). */
export interface RGB {
  r: number;
  g: number;
  b: number;
}
