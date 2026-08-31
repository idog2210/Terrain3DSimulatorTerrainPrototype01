import { useEffect } from 'react';
import { useSimStore } from '../store';
import { UI } from '../i18n';
import type { TerrainConcept } from '../utils/terrainTypes';

/**
 * The separate info screen for secondary concept detail — how to recognize
 * it in the 3D terrain and how it reads on a topographic map. Kept out of
 * the always-visible task panel so that panel stays to a single short
 * sentence plus goals.
 */
export default function ConceptDetailsModal({
  concept,
  onClose,
}: {
  concept: TerrainConcept;
  onClose: () => void;
}) {
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
        <h3 className="modal-title">{concept.title[lang]}</h3>

        <div className="modal-section">
          <span className="modal-section-label">{t.hudRecognize}</span>
          <p>{concept.recognize[lang]}</p>
        </div>
        <div className="modal-section">
          <span className="modal-section-label">{t.hudMapView}</span>
          <p>{concept.mapView[lang]}</p>
        </div>
      </div>
    </div>
  );
}
