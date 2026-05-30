import { useSimStore } from '../store';
import { UI } from '../i18n';
import type { LayerKey } from '../utils/terrainTypes';

/**
 * Toggle the analysis overlays on and off. Each row is an accessible toggle
 * button reflecting its state via aria-pressed (also drives the switch styling).
 */
export default function LayerTogglePanel() {
  const layers = useSimStore((s) => s.layers);
  const toggleLayer = useSimStore((s) => s.toggleLayer);
  const t = UI[useSimStore((s) => s.lang)];

  const rows: { key: LayerKey; name: string; desc: string }[] = [
    { key: 'contours', name: t.layerContours, desc: t.layerContoursDesc },
    { key: 'slope', name: t.layerSlope, desc: t.layerSlopeDesc },
    { key: 'labels', name: t.layerLabels, desc: t.layerLabelsDesc },
  ];

  return (
    <div className="panel layers">
      <p className="panel-label">{t.layersTitle}</p>
      {rows.map((l) => (
        <button
          key={l.key}
          type="button"
          className="layer-row"
          aria-pressed={layers[l.key]}
          onClick={() => toggleLayer(l.key)}
        >
          <span className="switch" aria-hidden="true" />
          <span className="layer-text">
            <span className="layer-name">{l.name}</span>
            <span className="layer-desc">{l.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
