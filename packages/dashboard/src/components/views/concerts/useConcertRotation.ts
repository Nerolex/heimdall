/**
 * Hook to rotate through concerts with saved state
 */

import { useEffect, useState, useRef } from 'react';
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

  // Track if we've just mounted/returned to this view
  const lastConcertsLength = useRef(concerts.length);
  
  useEffect(() => {
    // When concerts array changes (new data loaded), reset to saved state or 0
    if (concerts.length !== lastConcertsLength.current) {
      lastConcertsLength.current = concerts.length;
      if (savedState && savedState.__lastConcertId) {
        const idx = concerts.findIndex(c => c.id === savedState.__lastConcertId);
        if (idx >= 0) {
          setActiveIndex(idx);
          return;
        }
      }
      setActiveIndex(0);
    }
  }, [concerts, savedState]);

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
