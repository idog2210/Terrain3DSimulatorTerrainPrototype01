import { useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * Loads an optional PBR texture set from /public and returns it once ready, or
 * null if the files are absent. Designed for graceful fallback: a HEAD request
 * checks existence first (avoids broken-image errors), and any failure simply
 * yields null so the caller uses its procedural appearance instead.
 *
 * Expected filenames in the directory: albedo.jpg, normal.jpg, roughness.jpg
 * (any subset works; missing maps are just skipped).
 */
export interface PBRSet {
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
}

const FILES: { slot: keyof PBRSet; file: string; srgb: boolean }[] = [
  { slot: 'map', file: 'albedo.jpg', srgb: true },
  { slot: 'normalMap', file: 'normal.jpg', srgb: false },
  { slot: 'roughnessMap', file: 'roughness.jpg', srgb: false },
];

export function useOptionalPBR(dir: string, repeat: number): PBRSet | null {
  const [set, setSet] = useState<PBRSet | null>(null);

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();

    const tryLoad = async (file: string, srgb: boolean): Promise<THREE.Texture | undefined> => {
      const url = dir + file;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!res.ok) return undefined;
      } catch {
        return undefined;
      }
      return new Promise((resolve) => {
        loader.load(
          url,
          (t) => {
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(repeat, repeat);
            t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            t.anisotropy = 8;
            resolve(t);
          },
          undefined,
          () => resolve(undefined),
        );
      });
    };

    (async () => {
      const loaded = await Promise.all(FILES.map((f) => tryLoad(f.file, f.srgb)));
      if (!alive) return;
      const result: PBRSet = {};
      let any = false;
      FILES.forEach((f, i) => {
        if (loaded[i]) {
          result[f.slot] = loaded[i];
          any = true;
        }
      });
      setSet(any ? result : null);
    })();

    return () => {
      alive = false;
    };
  }, [dir, repeat]);

  return set;
}
