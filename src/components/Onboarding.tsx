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
    [t.ctlClickKeys, t.ctlClick],
    [t.ctlLayersKeys, t.ctlLayers],
  ];

  return (
    <div className="onboarding">
      <div className="onb-card panel">
        <h1>{t.onbWelcome}</h1>
        <p className="onb-intro">{t.onbIntro}</p>

        <div className="onb-grid">
          <section>
            <p className="panel-label">{t.onbControlsTitle}</p>
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
            <p className="panel-label">{t.objectivesTitle}</p>
            <ul className="onb-objectives">
              {t.objectives.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="onb-actions">
          <button type="button" className="btn primary" onClick={() => start('free')}>
            {t.startBtn}
          </button>
          <button type="button" className="btn" onClick={() => start('guided')}>
            {t.startGuidedBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
