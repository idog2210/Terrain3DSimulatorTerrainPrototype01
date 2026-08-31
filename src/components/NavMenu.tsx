import { useEffect, useRef, useState } from 'react';
import { useSimStore, type Mode } from '../store';
import { UI } from '../i18n';

/**
 * The single small menu button, top-left. Everything that isn't needed
 * every second — switching mode, resetting position, changing language —
 * lives behind it, closed by default.
 */
export default function NavMenu() {
  const lang = useSimStore((s) => s.lang);
  const t = UI[lang];
  const mode = useSimStore((s) => s.mode);
  const setMode = useSimStore((s) => s.setMode);
  const requestReset = useSimStore((s) => s.requestReset);

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

  const modes: { key: Mode; label: string }[] = [
    { key: 'free', label: t.modeFree },
    { key: 'guided', label: t.modeGuided },
    { key: 'demo', label: t.modeDemo },
  ];

  return (
    <div className="menu-anchor" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label={t.menuLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {open && (
        <div className="panel dropdown">
          <p className="menu-app-name">{t.appTitle}</p>
          <p className="menu-app-subtitle">{t.appSubtitle}</p>

          <hr className="menu-divider" />

          <div className="mode-switch" role="group">
            {modes.map((m) => (
              <button
                key={m.key}
                type="button"
                className={'mode-btn' + (mode === m.key ? ' active' : '')}
                onClick={() => {
                  setMode(m.key);
                  setOpen(false);
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'free' && (
            <button
              type="button"
              className="tool-btn"
              onClick={() => {
                requestReset();
                setOpen(false);
              }}
            >
              {t.reset}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
