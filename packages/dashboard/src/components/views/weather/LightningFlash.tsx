import React, { useEffect, useState, useCallback } from 'react';

/**
 * Hook that provides a flash value (0 or 1) for lightning effects.
 * Flashes every 4-12 seconds with occasional double flashes.
 */
export function useLightningFlash(): number {
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    const scheduleFlash = () => {
      const delay = 4000 + Math.random() * 8000;
      timeout = setTimeout(() => {
        setFlash(1);
        t1 = setTimeout(() => setFlash(0), 80);
        if (Math.random() < 0.3) {
          t2 = setTimeout(() => setFlash(1), 200);
          t3 = setTimeout(() => setFlash(0), 260);
        }
        scheduleFlash();
      }, delay);
    };

    scheduleFlash();
    return () => {
      clearTimeout(timeout);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return flash;
}
