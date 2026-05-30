import { create } from 'zustand';
import type { ConceptId, Lang, LayerKey } from './utils/terrainTypes';
import { TERRAIN_CONCEPTS } from './data/terrainConcepts';

/** Exploration modes. */
export type Mode = 'free' | 'guided' | 'demo';

/** Concept ids in the guided teaching order. */
const ORDER: ConceptId[] = TERRAIN_CONCEPTS.map((c) => c.id);

/**
 * Optional deep-link initial state for demos / presentations:
 *   ?lang=he         start in Hebrew (RTL)
 *   ?mode=guided     skip onboarding, open guided tour
 *   ?mode=demo       skip onboarding, run the auto demo
 *   ?start=1         skip onboarding into free exploration
 */
function initFromUrl(): { lang: Lang; mode: Mode; started: boolean } {
  // Hebrew-only interface.
  try {
    const p = new URLSearchParams(window.location.search);
    const m = p.get('mode');
    const mode: Mode = m === 'guided' || m === 'demo' ? m : 'free';
    const started = p.get('start') === '1' || m !== null;
    return { lang: 'he', mode, started };
  } catch {
    return { lang: 'he', mode: 'free', started: false };
  }
}

const initial = initFromUrl();

interface SimState {
  /** Interface language (drives text + RTL). */
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;

  /** False until the learner dismisses the onboarding overlay. */
  started: boolean;
  /** Begin the simulation in a given mode (dismisses onboarding). */
  start: (mode: Mode) => void;

  /** Current exploration mode. */
  mode: Mode;
  setMode: (mode: Mode) => void;

  /** Index into the guided teaching order (0..n-1). */
  guidedIndex: number;
  guidedNext: () => void;
  guidedPrev: () => void;

  /** Incremented to ask the controller to reset the player to spawn. */
  resetCount: number;
  requestReset: () => void;

  /** Currently selected educational concept, or null. */
  selectedId: ConceptId | null;
  select: (id: ConceptId | null) => void;

  /** Concept currently under the crosshair / cursor, or null (for hover styling). */
  hoveredId: ConceptId | null;
  setHovered: (id: ConceptId | null) => void;

  /** Visualization layer visibility. */
  layers: Record<LayerKey, boolean>;
  toggleLayer: (key: LayerKey) => void;
}

export const useSimStore = create<SimState>((set) => ({
  lang: initial.lang,
  setLang: (lang) => set({ lang }),
  toggleLang: () => set((s) => ({ lang: s.lang === 'en' ? 'he' : 'en' })),

  started: initial.started,
  start: (mode) =>
    set({
      started: true,
      mode,
      guidedIndex: 0,
      selectedId: mode === 'guided' ? ORDER[0] : null,
    }),

  mode: initial.mode,
  setMode: (mode) =>
    set((s) => ({
      mode,
      guidedIndex: 0,
      selectedId:
        mode === 'guided' ? ORDER[0] : mode === 'demo' ? null : s.selectedId,
    })),

  guidedIndex: 0,
  guidedNext: () =>
    set((s) => {
      const i = Math.min(ORDER.length - 1, s.guidedIndex + 1);
      return { guidedIndex: i, selectedId: ORDER[i] };
    }),
  guidedPrev: () =>
    set((s) => {
      const i = Math.max(0, s.guidedIndex - 1);
      return { guidedIndex: i, selectedId: ORDER[i] };
    }),

  resetCount: 0,
  requestReset: () => set((s) => ({ resetCount: s.resetCount + 1 })),

  selectedId: initial.started && initial.mode === 'guided' ? ORDER[0] : null,
  select: (id) => set({ selectedId: id }),

  hoveredId: null,
  setHovered: (id) => set((state) => (state.hoveredId === id ? state : { hoveredId: id })),

  layers: {
    contours: false,
    slope: false,
    labels: true,
  },
  toggleLayer: (key) =>
    set((state) => ({ layers: { ...state.layers, [key]: !state.layers[key] } })),
}));

/** Total number of guided concepts. */
export const GUIDED_TOTAL = ORDER.length;
