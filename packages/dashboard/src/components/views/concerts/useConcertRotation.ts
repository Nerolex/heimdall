/**
 * Hook to rotate through concerts with saved state
 */

import { useEffect, useState } from 'react';
import type { ConcertRecord } from '@heimdall/shared';
import type { ConcertsShowcaseSavedState, ViewInternalSettings } from '../../../app/internalSettings';

export function useConcertRotation(
  concerts: ConcertRecord[],
  viewType: string,
  savedState: ConcertsShowcaseSavedState | undefined,
  onStateChange: ViewInternalSettings['__onStateChange']
): number {
  const [activeIndex, setActiveIndex] = useState(() => {
    if (savedState && savedState.__lastConcertId) {
      const idx = concerts.findIndex(c => c.id === savedState.__lastConcertId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  useEffect(() => {
    if (concerts.length === 0) return;

    // Rotate every 30 seconds
    const interval = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % concerts.length;
        const concert = concerts[next];
        if (concert && onStateChange) {
          onStateChange({
            __view: viewType,
            __lastConcertId: concert.id,
            __lastRotation: Date.now(),
          } as ConcertsShowcaseSavedState);
        }
        return next;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [concerts, viewType, onStateChange]);

  return activeIndex;
}
