import { useRadialMenuControls } from '../hooks/useRadialMenuControls';
import { useSimStore } from '../store';
import { UI } from '../i18n';

const RADIUS = 92; // px from center to each wedge label

/**
 * The Tab-held quick-select wheel: switches mode or toggles a display layer
 * without ever releasing pointer lock, so mouse-look never has to stop to
 * reach a menu. Shows a small persistent hint the rest of the time so the
 * hotkey stays discoverable.
 */
export default function RadialMenu() {
  const t = UI[useSimStore((s) => s.lang)];
  const { open, items, selected, locked } = useRadialMenuControls();

  if (!open) {
    if (!locked) return null;
    return (
      <div className="radial-hint">
        <kbd>Tab</kbd>
        <span>{t.radialHint}</span>
      </div>
    );
  }

  const n = items.length;

  return (
    <div className="radial-menu" role="listbox" aria-label={t.radialHint}>
      <div className="radial-ring" aria-hidden="true" />
      <div className="radial-center" aria-hidden="true" />
      {items.map((item, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * RADIUS;
        const y = Math.sin(angle) * RADIUS;
        return (
          <div
            key={item.id}
            role="option"
            aria-selected={i === selected}
            className={
              'radial-item' +
              (i === selected ? ' selected' : '') +
              (item.active ? ' active' : '')
            }
            style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
          >
            {item.label}
          </div>
        );
      })}
    </div>
  );
}
