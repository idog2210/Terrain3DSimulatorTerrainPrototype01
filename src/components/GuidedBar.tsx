import { useSimStore, GUIDED_TOTAL } from '../store';
import { UI } from '../i18n';
import { TERRAIN_CONCEPTS } from '../data/terrainConcepts';

/**
 * Bottom-centre navigation for guided mode: step Previous / Next through the
 * seven concepts in teaching order, with a live counter and the current title.
 * The camera glides to each concept automatically (see CameraDirector).
 */
export default function GuidedBar() {
  const lang = useSimStore((s) => s.lang);
  const t = UI[lang];
  const idx = useSimStore((s) => s.guidedIndex);
  const next = useSimStore((s) => s.guidedNext);
  const prev = useSimStore((s) => s.guidedPrev);
  const setMode = useSimStore((s) => s.setMode);
  const concept = TERRAIN_CONCEPTS[idx];

  return (
    <div className="panel guided-bar">
      <button type="button" className="ghost-btn" onClick={prev} disabled={idx === 0}>
        {t.prev}
      </button>

      <div className="guided-center">
        <span className="guided-counter">{t.guidedCounter(idx + 1, GUIDED_TOTAL)}</span>
        <span className="guided-title">{concept.title[lang]}</span>
      </div>

      <button
        type="button"
        className="ghost-btn"
        onClick={next}
        disabled={idx === GUIDED_TOTAL - 1}
      >
        {t.next}
      </button>

      <button type="button" className="ghost-btn exit" onClick={() => setMode('free')}>
        {t.exitGuided}
      </button>
    </div>
  );
}
