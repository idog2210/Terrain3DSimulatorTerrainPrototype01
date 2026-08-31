import { useEffect } from 'react';
import { useSimStore } from '../store';
import { UI } from '../i18n';

/**
 * One-time popup shown when the simulation starts, presenting the current
 * task label and its goals. Dismissed by the learner and never shown again
 * this session — the always-visible task panel only keeps the selected
 * point's name and info.
 */
export default function TaskIntroModal({ onClose }: { onClose: () => void }) {
  const lang = useSimStore((s) => s.lang);
  const t = UI[lang];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay interactive" onClick={onClose}>
      <div className="panel modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" aria-label={t.closeBtn} onClick={onClose}>
          ×
        </button>
        <h3 className="modal-title">{t.taskLabel}</h3>

        <div className="modal-section">
          <span className="modal-section-label">{t.taskGoalLabel}</span>
          <ul className="task-goals">
            {t.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
