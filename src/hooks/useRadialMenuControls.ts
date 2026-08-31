import { useEffect, useMemo, useRef, useState } from 'react';
import { useSimStore, type Mode } from '../store';
import { UI } from '../i18n';
import type { LayerKey } from '../utils/terrainTypes';

type ActionId = Mode | LayerKey;
type ActionGroup = 'mode' | 'layer';

/** The five quick actions laid out clockwise from 12 o'clock. */
const ACTIONS: { id: ActionId; group: ActionGroup }[] = [
  { id: 'free', group: 'mode' },
  { id: 'guided', group: 'mode' },
  { id: 'demo', group: 'mode' },
  { id: 'contours', group: 'layer' },
  { id: 'slope', group: 'layer' },
];

const STEP = (Math.PI * 2) / ACTIONS.length;
/** Below this accumulated mouse offset (px) the wheel keeps its last pick — avoids jitter right as it opens. */
const DEADZONE = 12;

export interface RadialMenuItem {
  id: ActionId;
  group: ActionGroup;
  label: string;
  active: boolean;
}

/** Maps a screen-space angle (0 = pointing right, clockwise) to the wedge index, matching the layout RadialMenu renders. */
function angleToIndex(angle: number): number {
  const shifted = angle + Math.PI / 2; // rotate so wedge 0 (top) = 0
  const idx = Math.round(shifted / STEP);
  return ((idx % ACTIONS.length) + ACTIONS.length) % ACTIONS.length;
}

/**
 * Drives the Tab-held quick-select wheel: opens on keydown (only while
 * pointer-locked in free mode), tracks relative mouse movement to pick a
 * wedge, and commits on keyup — all without releasing the OS pointer lock.
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
              : a.id === 'demo'
                ? t.modeDemo
                : a.id === 'contours'
                  ? t.layerContours
                  : t.layerSlope,
        active: a.group === 'mode' ? mode === a.id : layers[a.id as LayerKey],
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

    const closeMenu = (apply: boolean) => {
      openRef.current = false;
      setOpen(false);
      useSimStore.getState().setRadialMenuOpen(false);
      if (!apply) return;

      const action = ACTIONS[selectedRef.current];
      if (action.group === 'mode') {
        const target = action.id as Mode;
        useSimStore.getState().setMode(target);
        // Leaving free mode drops the first-person controls entirely, so
        // release the OS-level lock too — guided/demo need a visible cursor.
        if (target !== 'free' && document.pointerLockElement) {
          document.exitPointerLock();
        }
      } else {
        useSimStore.getState().toggleLayer(action.id as LayerKey);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Tab') return;
      if (openRef.current) {
        e.preventDefault();
        return;
      }
      if (useSimStore.getState().mode !== 'free' || !document.pointerLockElement) return;
      e.preventDefault();
      openMenu();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Tab' || !openRef.current) return;
      e.preventDefault();
      closeMenu(true);
    };

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openRef.current) closeMenu(false);
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
      if (openRef.current && !document.pointerLockElement) closeMenu(false);
    };
    const onBlur = () => {
      if (openRef.current) closeMenu(false);
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

  return { open, items, selected, locked };
}
