import { useSimStore } from '../store';
import { CONCEPTS_BY_ID } from '../data/terrainConcepts';
import { UI } from '../i18n';
import { useImageExists } from '../hooks/useImageExists';

/**
 * The single right-side task panel: the selected point's name, its short
 * explanation sentence, and how to recognize it in the terrain and on a
 * map — all shown at once, no "more details" step.
 */
export default function TaskPanel() {
  const lang = useSimStore((s) => s.lang);
  const selectedId = useSimStore((s) => s.selectedId);
  const t = UI[lang];
  const concept = selectedId ? CONCEPTS_BY_ID[selectedId] : null;

  // Illustrative topographic-map crop for the selected concept. These are
  // generated assets (see public/concepts/PROMPTS.md) and may not exist yet
  // for every concept, so the <img> only renders once its file is confirmed
  // present — same "optional asset" spirit as useOptionalPBR.
  const mapImageSrc = concept ? `/concepts/${concept.id}.png` : '';
  const mapImageExists = useImageExists(mapImageSrc);

  return (
    <div className="panel task-panel">
      {!concept ? (
        <p className="task-empty">{t.taskEmpty}</p>
      ) : (
        <>
          <h2 className="task-title">{concept.title[lang]}</h2>
          <p className="task-body">{concept.meaning[lang]}</p>

          <hr className="task-divider" />

          <div className="task-section">
            <span className="task-section-label">{t.hudRecognize}</span>
            <p>{concept.recognize[lang]}</p>
          </div>
          <div className="task-section">
            <span className="task-section-label">{t.hudMapView}</span>
            <p>{concept.mapView[lang]}</p>
            {mapImageExists && (
              <div className="task-map-image">
                <img src={mapImageSrc} alt={t.mapImageAlt(concept.title[lang])} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
