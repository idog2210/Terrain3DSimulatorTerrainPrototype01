/**
 * Deterministic value-noise + fbm.
 *
 * Everything here is a pure function of its inputs — there is no `Math.random`
 * and no global mutable state — so the terrain is identical on every render,
 * every reload and on every machine. This is what makes the simulator a stable
 * teaching surface instead of a different world on each refresh.
 */

/** 32-bit integer hash -> float in [0, 1). Uses Math.imul for cross-platform stability. */
function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smoothstep easing (3t^2 - 2t^3) for C1-continuous interpolation. */
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Bilinearly interpolated value noise in [0, 1). */
export function valueNoise(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;

  const v00 = hash2(x0, y0);
  const v10 = hash2(x0 + 1, y0);
  const v01 = hash2(x0, y0 + 1);
  const v11 = hash2(x0 + 1, y0 + 1);

  const sx = smooth(fx);
  const sy = smooth(fy);

  const a = v00 + (v10 - v00) * sx;
  const b = v01 + (v11 - v01) * sx;
  return a + (b - a) * sy;
}

/**
 * Fractal Brownian motion: sum of octaves of value noise.
 * Returns a value in roughly [0, 1].
 */
export function fbm(
  x: number,
  y: number,
  octaves = 5,
  lacunarity = 2,
  gain = 0.5,
): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}
