import { useState } from 'react';
import { useSimStore } from '../store';
import { CONCEPTS_BY_ID } from '../data/terrainConcepts';
import { UI } from '../i18n';
import ConceptDetailsModal from './ConceptDetailsModal';

/**
 * The single right-side task panel: the selected point's name and its short
 * explanation sentence. The "current task" label and its goals are shown
 * once, in a popup, at the start of the simulation (see TaskIntroModal) —
 * not repeated here. Everything else about the selected concept (how to
 * spot it, how it reads on a map) lives one tap away in a separate info
 * screen, not in a second or third card here.
 */
export default function TaskPanel() {
  const lang = useSimStore((s) => s.lang);
  const selectedId = useSimStore((s) => s.selectedId);
  const t = UI[lang];
  const concept = selectedId ? CONCEPTS_BY_ID[selectedId] : null;
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="panel task-panel">
      {!concept ? (
        <p className="task-empty">{t.taskEmpty}</p>
      ) : (
        <>
          <h2 className="task-title">{concept.title[lang]}</h2>
          <p className="task-body">{concept.meaning[lang]}</p>
        </>
      )}

      {concept && (
        <button type="button" className="task-more" onClick={() => setDetailsOpen(true)}>
          {t.moreDetails}
        </button>
      )}

      {detailsOpen && concept && (
        <ConceptDetailsModal concept={concept} onClose={() => setDetailsOpen(false)} />
      )}
    </div>
  );
}
