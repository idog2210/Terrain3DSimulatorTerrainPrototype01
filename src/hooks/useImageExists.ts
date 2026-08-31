import { useEffect, useState } from 'react';

/**
 * Checks whether a static image under /public actually exists, so callers can
 * render optional artwork (not yet supplied) without a broken-image flash.
 * Mirrors the HEAD-check strategy in useOptionalPBR, adapted for plain <img>.
 */
export function useImageExists(src: string): boolean {
  const [exists, setExists] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!src) {
        if (alive) setExists(false);
        return;
      }
      try {
        const res = await fetch(src, { method: 'HEAD' });
        if (alive) setExists(res.ok);
      } catch {
        if (alive) setExists(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [src]);

  return exists;
}
