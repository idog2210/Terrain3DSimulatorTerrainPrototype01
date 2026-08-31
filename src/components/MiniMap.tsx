import { useEffect, useRef } from 'react';
import {
  HALF,
  TERRAIN_SIZE,
  getHeight,
  getNormal,
  getHeightRange,
  terrainColor,
  colorTint,
  moisture01,
} from '../utils/terrainHeight';
import { TERRAIN_CONCEPTS } from '../data/terrainConcepts';
import { useSimStore } from '../store';
import { UI } from '../i18n';
import { playerPose } from '../playerPose';

/**
 * Top-down overview that doubles as a simple topographic map: a shaded-relief
 * base (hypsometric tint + hillshade) with baked-in contour lines, concept
 * dots and a live player view-cone. This is the "map comparison" surface — it
 * helps the learner connect the 3D terrain to how it reads on a contour map.
 *
 * The relief + contours are rendered once to an offscreen canvas; an animation
 * loop then draws that base plus the moving player, reading pose via getState()
 * so the high-frequency drawing never re-renders React. North (−Z) is up.
 */

const RES = 220; // offscreen resolution == canvas backing size (crisp 1:1)
const LIGHT = (() => {
  const v = [-0.6, 0.72, -0.34];
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len] as const;
})();

function toPx(world: number): number {
  return ((world + HALF) / TERRAIN_SIZE) * RES;
}

/** Build the shaded-relief base with baked contour lines (once). */
function buildBase(): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = RES;
  off.height = RES;
  const ctx = off.getContext('2d')!;

  // Shaded relief.
  const img = ctx.createImageData(RES, RES);
  const data = img.data;
  for (let py = 0; py < RES; py++) {
    const z = -HALF + (py / (RES - 1)) * TERRAIN_SIZE;
    for (let px = 0; px < RES; px++) {
      const x = -HALF + (px / (RES - 1)) * TERRAIN_SIZE;
      const h = getHeight(x, z);
      const n = getNormal(x, z);
      const slope01 = Math.acos(n[1] < -1 ? -1 : n[1] > 1 ? 1 : n[1]) / (Math.PI / 2);
      const c = terrainColor(h, slope01, colorTint(x, z), moisture01(x, z));
      const dot = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
      // High floor so the whole map stays evenly lit (no near-black areas),
      // with just enough relief shading to read the terrain.
      const shade = 1.0 + 0.32 * Math.max(0, dot);
      const o = (py * RES + px) * 4;
      // Brighten + lift the low end so dark soil / channels never go dark.
      data[o] = Math.min(255, (c.r * 0.8 + 0.16) * 255 * shade);
      data[o + 1] = Math.min(255, (c.g * 0.8 + 0.15) * 255 * shade);
      data[o + 2] = Math.min(255, (c.b * 0.8 + 0.13) * 255 * shade);
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Contour lines (marching squares on a coarse grid).
  const G = 110;
  const cell = TERRAIN_SIZE / G;
  const grid: number[] = new Array((G + 1) * (G + 1));
  for (let iz = 0; iz <= G; iz++) {
    for (let ix = 0; ix <= G; ix++) {
      grid[iz * (G + 1) + ix] = getHeight(-HALF + ix * cell, -HALF + iz * cell);
    }
  }
  const H = (ix: number, iz: number) => grid[iz * (G + 1) + ix];
  const { min, max } = getHeightRange();
  const interval = 4;
  const first = Math.ceil(min / interval) * interval;
  let li = Math.round(first / interval);
  const px = (wx: number) => ((wx + HALF) / TERRAIN_SIZE) * RES;

  for (let level = first; level <= max; level += interval, li++) {
    const index = li % 4 === 0;
    ctx.strokeStyle = index ? 'rgba(46, 34, 18, 0.6)' : 'rgba(40, 32, 20, 0.3)';
    ctx.lineWidth = index ? 0.9 : 0.6;
    ctx.beginPath();
    for (let iz = 0; iz < G; iz++) {
      for (let ix = 0; ix < G; ix++) {
        const x0 = -HALF + ix * cell;
        const z0 = -HALF + iz * cell;
        const x1 = x0 + cell;
        const z1 = z0 + cell;
        const h0 = H(ix, iz);
        const h1 = H(ix + 1, iz);
        const h2 = H(ix + 1, iz + 1);
        const h3 = H(ix, iz + 1);
        const pts: number[] = [];
        const edge = (ha: number, hb: number, xa: number, za: number, xb: number, zb: number) => {
          if (ha < level !== hb < level && ha !== hb) {
            const t = (level - ha) / (hb - ha);
            pts.push(px(xa + (xb - xa) * t), px(za + (zb - za) * t));
          }
        };
        edge(h0, h1, x0, z0, x1, z0);
        edge(h1, h2, x1, z0, x1, z1);
        edge(h2, h3, x1, z1, x0, z1);
        edge(h3, h0, x0, z1, x0, z0);
        if (pts.length >= 4) {
          ctx.moveTo(pts[0], pts[1]);
          ctx.lineTo(pts[2], pts[3]);
          if (pts.length === 8) {
            ctx.moveTo(pts[4], pts[5]);
            ctx.lineTo(pts[6], pts[7]);
          }
        }
      }
    }
    ctx.stroke();
  }
  return off;
}

export default function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lang = useSimStore((s) => s.lang);
  const t = UI[lang];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const Hc = canvas.height;
    const toX = (wx: number) => toPx(wx) * (W / RES);
    const toY = (wz: number) => toPx(wz) * (Hc / RES);

    // The shaded-relief base is heavy to compute; defer it to idle time so the
    // panel paints immediately and entering the scene never hitches.
    let base: HTMLCanvasElement | null = null;
    const schedule: (cb: () => void) => number =
      typeof window.requestIdleCallback === 'function'
        ? (cb) => window.requestIdleCallback(cb)
        : (cb) => window.setTimeout(cb, 1);
    const cancelIdle: (id: number) => void =
      typeof window.cancelIdleCallback === 'function'
        ? (id) => window.cancelIdleCallback(id)
        : (id) => window.clearTimeout(id);
    const idleId = schedule(() => {
      base = buildBase();
    });

    let raf = 0;
    let lastX = NaN;
    let lastZ = NaN;
    let lastHeading = NaN;
    let lastSelected: string | null | undefined;
    const draw = () => {
      if (!base) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const player = playerPose;
      const selectedId = useSimStore.getState().selectedId;
      if (
        player.x === lastX &&
        player.z === lastZ &&
        player.heading === lastHeading &&
        selectedId === lastSelected
      ) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastX = player.x;
      lastZ = player.z;
      lastHeading = player.heading;
      lastSelected = selectedId;

      ctx.clearRect(0, 0, W, Hc);
      ctx.drawImage(base, 0, 0, W, Hc);

      // Concept dots.
      for (const c of TERRAIN_CONCEPTS) {
        const cx = toX(c.position.x);
        const cy = toY(c.position.z);
        const isSel = c.id === selectedId;
        if (isSel) {
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.strokeStyle = c.accent;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, isSel ? 3.6 : 2.6, 0, Math.PI * 2);
        ctx.fillStyle = c.accent;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.stroke();
      }

      // Player view cone + heading arrow (0 = north / up).
      const pxp = toX(player.x);
      const pyp = toY(player.z);
      const coneLen = 30 * (W / TERRAIN_SIZE);
      const half = ((72 * Math.PI) / 180) / 2;
      ctx.save();
      ctx.translate(pxp, pyp);
      ctx.rotate(player.heading);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, coneLen, -Math.PI / 2 - half, -Math.PI / 2 + half);
      ctx.closePath();
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, coneLen);
      grad.addColorStop(0, 'rgba(240, 246, 252, 0.3)');
      grad.addColorStop(1, 'rgba(240, 246, 252, 0)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fillStyle = '#eef1f4';
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      cancelIdle(idleId);
    };
  }, []);

  return (
    <div className="panel minimap">
      <div className="minimap-head">
        <p className="panel-label">{t.mapTitle}</p>
        <span className="north">{t.mapNorth} ↑</span>
      </div>
      <div className="minimap-frame">
        <canvas ref={canvasRef} width={220} height={220} />
      </div>
    </div>
  );
}
