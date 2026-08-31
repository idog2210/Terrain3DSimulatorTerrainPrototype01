import { useEffect, useRef, useState } from 'react';
import { useSimStore } from '../store';
import { UI } from '../i18n';
import LayerTogglePanel from './LayerTogglePanel';

/**
 * Display-settings menu: the layer toggles live behind this button, closed
 * by default, instead of an always-open panel competing with the task panel.
 */
export default function ViewMenu() {
  const t = UI[useSimStore((s) => s.lang)];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu-anchor" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label={t.viewLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="10" height="10" rx="2" />
          <rect x="10" y="10" width="10" height="10" rx="2" />
        </svg>
      </button>

      {open && (
        <div className="panel dropdown">
          <p className="menu-section-label">{t.viewLabel}</p>
          <LayerTogglePanel />
        </div>
      )}
    </div>
  );
}
