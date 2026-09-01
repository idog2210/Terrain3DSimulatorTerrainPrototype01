import { useEffect, useMemo, useRef, useState } from 'react';
import { useSimStore, type Mode } from '../store';
import { UI } from '../i18n';
import type { LayerKey } from '../utils/terrainTypes';

type ActionId = Mode | LayerKey;
type ActionGroup = 'mode' | 'layer';
type Action = { id: ActionId; group: ActionGroup };

/** The four quick actions laid out clockwise from 12 o'clock. */
const ACTIONS: Action[] = [
  { id: 'free', group: 'mode' },
  { id: 'guided', group: 'mode' },
  { id: 'contours', group: 'layer' },
  { id: 'slope', group: 'layer' },
];

const STEP = (Math.PI * 2) / ACTIONS.length;
/** Below this accumulated mouse offset (px) the wheel keeps its last pick — avoids jitter right as it opens. */
const DEADZONE = 12;

/** Direct keyboard shortcuts for the layer wedges, live only while the wheel
 *  is held open — lets a layer be toggled without steering the wheel by hand. */
const LAYER_SHORTCUTS: Record<string, LayerKey> = {
  KeyC: 'contours',
  KeyS: 'slope',
};

/** Reverse lookup so the menu can show each layer wedge's key next to its label. */
const SHORTCUT_LABELS: Partial<Record<LayerKey, string>> = Object.fromEntries(
  Object.entries(LAYER_SHORTCUTS).map(([code, layer]) => [layer, code.replace('Key', '')]),
);

export interface RadialMenuItem {
  id: ActionId;
  group: ActionGroup;
  label: string;
  active: boolean;
  shortcut?: string;
}

/** Maps a screen-space angle (0 = pointing right, clockwise) to the wedge index, matching the layout RadialMenu renders. */
function angleToIndex(angle: number): number {
  const shifted = angle + Math.PI / 2; // rotate so wedge 0 (top) = 0
  const idx = Math.round(shifted / STEP);
  return ((idx % ACTIONS.length) + ACTIONS.length) % ACTIONS.length;
}

/**
 * Drives the Tab-held quick-select wheel: opens on keydown (while
 * pointer-locked in free mode, or any time in guided mode, which has no
 * lock), tracks relative mouse movement to pick a wedge, and commits on
 * keyup — all without releasing the OS pointer lock in free mode.
 * While held, KeyC / KeyS also toggle their layer directly and close the
 * wheel right away, as a shortcut around steering to that wedge by hand.
 * Escape, losing focus, or losing the lock underneath it cancels instead.
 */
export function useRadialMenuControls() {
  const lang = useSimStore((s) => s.lang);
  const mode = useSimStore((s) => s.mode);
  const layers = useSimStore((s) => s.layers);
  const t = UI[lang];

  const items: RadialMenuItem[] = useMemo(
    () =>
      ACTIONS.map((a) => ({
        ...a,
        label:
          a.id === 'free'
            ? t.modeFree
            : a.id === 'guided'
              ? t.modeGuided
              : a.id === 'contours'
                ? t.layerContours
                : t.layerSlope,
        active: a.group === 'mode' ? mode === a.id : layers[a.id as LayerKey],
        shortcut: a.group === 'layer' ? SHORTCUT_LABELS[a.id as LayerKey] : undefined,
      })),
    [t, mode, layers],
  );

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [locked, setLocked] = useState(false);
  const openRef = useRef(false);
  const selectedRef = useRef(0);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onLockChange = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', onLockChange);
    return () => document.removeEventListener('pointerlockchange', onLockChange);
  }, []);

  useEffect(() => {
    const openMenu = () => {
      offset.current = { x: 0, y: 0 };
      selectedRef.current = 0;
      openRef.current = true;
      setSelected(0);
      setOpen(true);
      useSimStore.getState().setRadialMenuOpen(true);
    };

    const closeMenu = (action: Action | null) => {
      openRef.current = false;
      setOpen(false);
      useSimStore.getState().setRadialMenuOpen(false);
      if (!action) return;

      if (action.group === 'mode') {
        // Guided mode uses PointerLockControls too (look-around + WASD/arrow
        // wander around each station), so keep the OS-level lock through the
        // switch instead of dropping it — otherwise the learner has to click
        // the canvas again before they can move.
        useSimStore.getState().setMode(action.id as Mode);
      } else {
        useSimStore.getState().toggleLayer(action.id as LayerKey);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (openRef.current) {
        const layerKey = LAYER_SHORTCUTS[e.code];
        if (layerKey) {
          e.preventDefault();
          closeMenu({ id: layerKey, group: 'layer' });
          return;
        }
        if (e.code === 'Tab') e.preventDefault();
        return;
      }
      if (e.code !== 'Tab') return;
      const currentMode = useSimStore.getState().mode;
      // Free mode drives the wheel via pointer-lock deltas, so it needs the
      // lock held; guided mode has a visible, unlocked cursor and can open
      // the wheel directly — it's how guided mode reaches free mode again.
      if (currentMode === 'free' && !document.pointerLockElement) return;
      e.preventDefault();
      openMenu();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Tab' || !openRef.current) return;
      e.preventDefault();
      closeMenu(ACTIONS[selectedRef.current]);
    };

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openRef.current) closeMenu(null);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!openRef.current) return;
      offset.current.x += e.movementX;
      offset.current.y += e.movementY;
      const dist = Math.hypot(offset.current.x, offset.current.y);
      if (dist < DEADZONE) return;
      const idx = angleToIndex(Math.atan2(offset.current.y, offset.current.x));
      if (idx !== selectedRef.current) {
        selectedRef.current = idx;
        setSelected(idx);
      }
    };

    // Losing window focus or the pointer lock itself (e.g. a physical Esc,
    // which the browser always honors) mid-gesture cancels rather than commits.
    const onLockLost = () => {
      if (openRef.current && !document.pointerLockElement) closeMenu(null);
    };
    const onBlur = () => {
      if (openRef.current) closeMenu(null);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keydown', onEscape);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('blur', onBlur);
    document.addEventListener('pointerlockchange', onLockLost);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keydown', onEscape);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('pointerlockchange', onLockLost);
    };
  }, []);

  // The persistent "Tab" hint should show whenever the wheel is actually
  // reachable: pointer-locked in free mode, or unconditionally in guided
  // mode (which has no lock but still opens the wheel).
  const hintVisible = locked || mode === 'guided';

  return { open, items, selected, hintVisible };
}
