import { useEffect, useRef } from 'react';
import { useSimStore } from '../store';
import { CONCEPTS_BY_ID } from '../data/terrainConcepts';
import { UI } from '../i18n';
import { playerPose } from '../playerPose';

/**
 * Live azimuth (0-360°, bearing from the player to the selected concept) and
 * range (straight-line ground distance, metres), shown as a single compact
 * status pill under the task panel — a real live readout, not decoration.
 * Reads `playerPose` directly in a rAF loop so the numbers stay smooth while
 * walking or during the guided camera glide. Hidden while nothing is selected.
 */
export default function AzimuthRangePanel() {
  const lang = useSimStore((s) => s.lang);
  const selectedId = useSimStore((s) => s.selectedId);
  const t = UI[lang];
  const azRef = useRef<HTMLSpanElement>(null);
  const rangeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    const concept = CONCEPTS_BY_ID[selectedId];
    let raf = 0;
    const draw = () => {
      const dx = concept.position.x - playerPose.x;
      const dz = concept.position.z - playerPose.z;
      // 0° = north / -Z, matching the heading convention used everywhere else.
      const azimuth = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
      const range = Math.hypot(dx, dz);
      if (azRef.current) {
        azRef.current.textContent = `${Math.round(azimuth).toString().padStart(3, '0')}°`;
      }
      if (rangeRef.current) {
        rangeRef.current.textContent = `${Math.round(range)} ${t.azRangeUnit}`;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [selectedId, t.azRangeUnit]);

  if (!selectedId) return null;
  const concept = CONCEPTS_BY_ID[selectedId];

  return (
    <div className="panel az-pill" aria-label={t.azRangeTitle}>
      <span className="az-pill-target">{concept.title[lang]}</span>
      <span className="az-pill-sep">·</span>
      <span className="az-pill-stat" ref={azRef}>
        —
      </span>
      <span className="az-pill-caption">{t.azimuthLabel}</span>
      <span className="az-pill-sep">·</span>
      <span className="az-pill-stat" ref={rangeRef}>
        —
      </span>
      <span className="az-pill-caption">{t.rangeLabel}</span>
    </div>
  );
}
