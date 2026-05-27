import { useEffect, useState } from 'react';
import type { EventsViewSnapshot } from '@heimdall/shared';

type SnapshotStatus = 'loading' | 'ready' | 'empty' | 'error' | 'stale';

interface CacheEntry {
  snapshot: EventsViewSnapshot;
  status: SnapshotStatus;
  timestamp: number;
}

// Module-level cache shared across all mounts (including preload renders).
// When the preload div renders a view at opacity:0, it populates the cache.
// On the next real mount (during fade-in) the data is available immediately,
// preventing a null→content reflow mid-animation that causes the clock to jitter.
const snapshotCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Clear the cache — intended for use in tests to ensure isolation between test cases. */
export function clearSnapshotCache(): void {
  snapshotCache.clear();
}

export function useEventsSnapshot(
  viewType: string,
  days?: number
): { snapshot: EventsViewSnapshot | null; status: SnapshotStatus; error: string | null } {
  const cacheKey = `${viewType}-${days ?? ''}`;
  const cached = snapshotCache.get(cacheKey);
  const isValid = cached != null && Date.now() - cached.timestamp < CACHE_TTL_MS;

  const [snapshot, setSnapshot] = useState<EventsViewSnapshot | null>(isValid ? cached.snapshot : null);
  const [status, setStatus] = useState<SnapshotStatus>(isValid ? cached.status : 'loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hadCachedData = isValid; // capture at effect-run time; don't put isValid in deps
    const url = `/api/events/snapshot?type=${encodeURIComponent(viewType)}${days != null ? `&days=${days}` : ''}`;

    fetch(url)
      .then(async res => {
        if (cancelled) return;
        if (res.status === 404) {
          setStatus('error');
          setError('No snapshot available');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          setError(`HTTP ${res.status}`);
          return;
        }
        const data = (await res.json()) as EventsViewSnapshot;
        const newStatus: SnapshotStatus =
          data.events.length === 0 ? 'empty' : data.stale ? 'stale' : 'ready';
        snapshotCache.set(cacheKey, { snapshot: data, status: newStatus, timestamp: Date.now() });
        setSnapshot(data);
        setStatus(newStatus);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (!hadCachedData) {
          setStatus('error');
          setError(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [viewType, days, cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { snapshot, status, error };
}
