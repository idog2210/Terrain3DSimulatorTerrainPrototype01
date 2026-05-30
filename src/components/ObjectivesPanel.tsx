import { useSimStore } from '../store';
import { UI } from '../i18n';

/** Compact learning-objectives panel, always visible during the session. */
export default function ObjectivesPanel() {
  const t = UI[useSimStore((s) => s.lang)];
  return (
    <div className="panel objectives">
      <p className="panel-label">{t.objectivesTitle}</p>
      <ul>
        {t.objectives.map((o, i) => (
          <li key={i}>{o}</li>
        ))}
      </ul>
    </div>
  );
}
