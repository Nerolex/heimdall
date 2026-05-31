import { useRef } from 'react';
import type { EventRecord } from '@heimdall/shared';
import type { EventsShowcaseSavedState, ViewSavedState } from '../../../app/internalSettings';

/**
 * Module-level counters keyed by rotation key.
 * Survives component unmount/remount so consecutive displays of the same view type
 * advance through the event list rather than always showing the first event.
 */
const rotationCounters = new Map<string, number>();

/** Reset all rotation counters — intended for use in tests to ensure isolation between test cases. */
export function resetRotationCounters(): void {
  rotationCounters.clear();
}

/**
 * Round-robin event rotation across mounts.
 *
 * On each new mount, advances to the next event in the list.
 * When the caller provides a savedState (back navigation), restores that exact event instead.
 *
 * @param events - The event list to rotate through.
 * @param rotationKey - A stable string key that namespaces the counter (e.g. the view type).
 * @param savedState - Saved index from a previous mount at this history position; skips advancement when set.
 * @param onStateChange - Called with the chosen index so the caller can persist it for back navigation.
 */
export function useEventRotation(
  events: EventRecord[],
  rotationKey: 'events-today' | 'events-upcoming',
  savedState: EventsShowcaseSavedState | undefined,
  onStateChange: ((state: ViewSavedState) => void) | undefined
): number {
  const indexRef = useRef<number | null>(null);
  // Capture initial prop values; only read once, when events first become available
  const savedStateRef = useRef(savedState);
  const onStateChangeRef = useRef(onStateChange);

  if (indexRef.current === null && events.length > 0) {
    if (savedStateRef.current != null) {
      indexRef.current = savedStateRef.current.activeIndex % events.length;
    } else {
      const current = rotationCounters.get(rotationKey) ?? 0;
      indexRef.current = current % events.length;
      rotationCounters.set(rotationKey, (current + 1) % events.length);
      onStateChangeRef.current?.({ __view: rotationKey, activeIndex: indexRef.current });
    }
  }

  return indexRef.current ?? 0;
}
