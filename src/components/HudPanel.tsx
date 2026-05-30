import { useSimStore } from '../store';
import { CONCEPTS_BY_ID } from '../data/terrainConcepts';
import { UI } from '../i18n';

/**
 * The selected-concept panel. Reads the current selection (set by clicking a
 * beacon or by guided mode) and presents the concept across three teaching
 * dimensions: what it is, how to spot it in the 3D terrain, and how it appears
 * on a topographic map — the core 3D ↔ map-reading connection.
 */
export default function HudPanel() {
  const lang = useSimStore((s) => s.lang);
  const selectedId = useSimStore((s) => s.selectedId);
  const t = UI[lang];
  const concept = selectedId ? CONCEPTS_BY_ID[selectedId] : null;

  return (
    <div className="panel hud">
      {!concept ? (
        <p className="empty">{t.hudEmpty}</p>
      ) : (
        <>
          <p className="eyebrow">{t.hudEyebrow}</p>
          <h2>{concept.title[lang]}</h2>

          <div className="hud-section">
            <span className="hud-section-label">{t.hudMeaning}</span>
            <p>{concept.meaning[lang]}</p>
          </div>
          <div className="hud-section">
            <span className="hud-section-label">{t.hudRecognize}</span>
            <p>{concept.recognize[lang]}</p>
          </div>
          <div className="hud-section map">
            <span className="hud-section-label">{t.hudMapView}</span>
            <p>{concept.mapView[lang]}</p>
          </div>
        </>
      )}
    </div>
  );
}
