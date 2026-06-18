import { useEffect, useState, useRef } from 'react';

interface RotationSavedState {
  id?: string;
  index?: number;
}

interface UseViewRotationOptions {
  /** Key for module-level mount counter (only used when no saved state / interval mode). */
  mountKey?: string;
  /** Interval in ms for continuous rotation (default: 30000). Set to 0 for mount-only mode. */
  intervalMs?: number;
}

const mountCounters = new Map<string, number>();

/** Reset mount counters — for tests. */
export function resetRotationCounters(): void {
  mountCounters.clear();
}

/**
 * Generic view rotation hook.
 *
 * Two modes:
 * 1. **Interval mode** (default, `intervalMs > 0`): rotates through items every N ms,
 *    persisting current state via `onStateChange`.
 * 2. **Mount mode** (`intervalMs = 0`): advances one step each time the component
 *    mounts (uses a module-level counter).
 *
 * @param items - Array of items to rotate through.
 * @param viewType - Stable view type string (e.g. "events-today", "concerts-upcoming").
 * @param savedState - Restored state from a previous mount (back-navigation).
 * @param onStateChange - Called with current index/item so caller can persist.
 * @param getId - Function to extract a stable ID from an item (default: `item.id`).
 * @param options - `mountKey` for mount counter, `intervalMs` for rotation speed.
 */
export function useViewRotation<T extends { id: string }>(
  items: T[],
  viewType: string,
  savedState: RotationSavedState | undefined,
  onStateChange: ((state: Record<string, unknown>) => void) | undefined,
  getId?: (item: T) => string,
  options?: UseViewRotationOptions
): number {
  const { mountKey = viewType, intervalMs = 30000 } = options ?? {};
  const resolveId = getId ?? ((item: T) => item.id);

  const [activeIndex, setActiveIndex] = useState(() => {
    if (savedState?.id && items.length > 0) {
      const idx = items.findIndex(i => resolveId(i) === savedState.id);
      if (idx >= 0) return idx;
    }
    if (savedState?.index != null && savedState.index < items.length) {
      return savedState.index;
    }
    return 0;
  });

  // Track items array length to detect data refreshes
  const lastLength = useRef(items.length);

  // On items change (new data loaded), try to restore saved state or reset
  useEffect(() => {
    if (items.length !== lastLength.current) {
      lastLength.current = items.length;
      if (savedState?.id) {
        const idx = items.findIndex(i => resolveId(i) === savedState.id);
        if (idx >= 0) {
          setActiveIndex(idx);
          return;
        }
      }
      if (savedState?.index != null && savedState.index < items.length) {
        setActiveIndex(savedState.index);
        return;
      }
      setActiveIndex(0);
    }
  }, [items, savedState, resolveId]);

  // Interval mode: rotate continuously
  useEffect(() => {
    if (intervalMs <= 0 || items.length === 0) return;

    const interval = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % items.length;
        const item = items[next];
        if (item && onStateChange) {
          onStateChange({ __view: viewType, id: resolveId(item), index: next } as Record<string, unknown>);
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [items, intervalMs, viewType, onStateChange, resolveId]);

  // Mount mode: advance once on mount (only when no saved state)
  useEffect(() => {
    if (intervalMs > 0 || items.length === 0) return;
    if (savedState != null) return; // restored, don't advance

    const current = mountCounters.get(mountKey) ?? 0;
    const nextIndex = current % items.length;
    mountCounters.set(mountKey, (current + 1) % items.length);

    setActiveIndex(nextIndex);
    onStateChange?.({ __view: viewType, index: nextIndex } as Record<string, unknown>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountKey, items.length]);

  return activeIndex;
}
