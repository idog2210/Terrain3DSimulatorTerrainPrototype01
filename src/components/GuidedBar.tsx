import { useEffect } from 'react';
import { useSimStore, GUIDED_TOTAL } from '../store';
import { UI } from '../i18n';
import { TERRAIN_CONCEPTS } from '../data/terrainConcepts';

/**
 * Bottom-centre navigation for guided mode: step Previous / Next through the
 * seven concepts in teaching order (buttons, or Q / E), with the current
 * title. The camera glides to each concept automatically (see
 * CameraDirector). Next becomes Finish on the last station and ends the
 * tour back to the onboarding screen.
 */
export default function GuidedBar() {
  const lang = useSimStore((s) => s.lang);
  const t = UI[lang];
  const idx = useSimStore((s) => s.guidedIndex);
  const next = useSimStore((s) => s.guidedNext);
  const prev = useSimStore((s) => s.guidedPrev);
  const finish = useSimStore((s) => s.finishGuided);
  const concept = TERRAIN_CONCEPTS[idx];
  const isLast = idx === GUIDED_TOTAL - 1;
  const advance = isLast ? finish : next;

  // Q / E step through stations, freeing the arrow keys for wander movement.
  // On the last station E ends the tour instead of advancing further.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ') prev();
      else if (e.code === 'KeyE') advance();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prev, advance]);

  return (
    <div className="panel guided-bar">
      <button type="button" className="ghost-btn" onClick={prev} disabled={idx === 0}>
        {t.prev}
        <span className="key-hint">Q</span>
      </button>

      <div className="guided-center">
        <span className="guided-title">{concept.title[lang]}</span>
      </div>

      <button type="button" className="ghost-btn" onClick={advance}>
        {isLast ? t.finish : t.next}
        <span className="key-hint">E</span>
      </button>
    </div>
  );
}
