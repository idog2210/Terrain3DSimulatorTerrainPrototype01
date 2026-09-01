import { useSimStore } from '../store';
import { UI } from '../i18n';

/**
 * The start screen, shown over a live terrain backdrop. Explains the simulator,
 * lists the controls and learning objectives, offers a language toggle, and
 * launches either free exploration or the guided tour.
 */
export default function Onboarding() {
  const lang = useSimStore((s) => s.lang);
  const t = UI[lang];
  const start = useSimStore((s) => s.start);

  const controls: [string, string][] = [
    [t.ctlMoveKeys, t.ctlMove],
    [t.ctlLookKeys, t.ctlLook],
    [t.ctlQuickMenuKeys, t.ctlQuickMenu],
  ];

  // The Pointer Lock API only grants the lock in direct response to a user
  // gesture, and the canvas' own click-to-lock listener (PointerLockControls)
  // only exists once guided mode has mounted a frame later — so request the
  // lock here, synchronously inside this click handler, on the canvas that's
  // already present behind the onboarding overlay (the demo tour backdrop).
  const startGuided = () => {
    const canvas = document.querySelector<HTMLCanvasElement>('.app canvas');
    canvas?.requestPointerLock()?.catch?.(() => {});
    start('guided');
  };

  return (
    <div className="onboarding">
      <div className="onb-card panel">
        <h1>{t.onbWelcome}</h1>
        <p className="onb-intro">{t.onbIntro}</p>

        <div className="onb-grid">
          <section>
            <p className="onb-subhead">{t.onbControlsTitle}</p>
            <ul className="onb-controls">
              {controls.map(([k, v], i) => (
                <li key={i}>
                  <kbd>{k}</kbd>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="onb-subhead">{t.objectivesTitle}</p>
            <ul className="onb-objectives">
              {t.objectives.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="onb-interact">
          <p className="onb-subhead">{t.onbInteractTitle}</p>
          <p className="onb-subtext">{t.onbInteractDesc}</p>
        </div>

        <div className="onb-actions">
          <button type="button" className="btn primary" onClick={() => start('free')}>
            {t.startBtn}
          </button>
          <button type="button" className="btn" onClick={() => startGuided()}>
            {t.startGuidedBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
