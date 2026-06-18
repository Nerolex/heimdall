import { useEffect, useState } from 'react';

export type SnapshotStatus = 'loading' | 'ready' | 'empty' | 'error' | 'stale';

interface CacheEntry<T> {
  data: T;
  status: SnapshotStatus;
  timestamp: number;
}

const snapshotCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Clear the snapshot cache — for tests. */
export function clearSnapshotCache(): void {
  snapshotCache.clear();
}

interface UseViewSnapshotOptions {
  cacheKey?: string;
  cacheTTL?: number;
  refreshIntervalMs?: number;
}

export function useViewSnapshot<T extends { events?: unknown[]; concerts?: unknown[] }>(
  buildUrl: () => string,
  options?: UseViewSnapshotOptions
): { data: T | null; status: SnapshotStatus; error: string | null } {
  const { cacheKey, cacheTTL = CACHE_TTL_MS, refreshIntervalMs } = options ?? {};

  const cached = cacheKey ? (snapshotCache.get(cacheKey) as CacheEntry<T> | undefined) : undefined;
  const isValid = cached != null && Date.now() - cached.timestamp < cacheTTL;

  const [data, setData] = useState<T | null>(isValid ? cached.data : null);
  const [status, setStatus] = useState<SnapshotStatus>(isValid ? cached.status : 'loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hadCachedData = isValid;

    const fetchSnapshot = async () => {
      try {
        const url = buildUrl();
        const res = await fetch(url);

        if (cancelled) return;

        if (res.status === 422 || res.status === 404) {
          if (!hadCachedData) {
            setData(null);
            setStatus('empty');
          }
          return;
        }

        if (!res.ok) {
          if (!hadCachedData) {
            setStatus('error');
            setError(`HTTP ${res.status}`);
          }
          return;
        }

        const result = (await res.json()) as T;
        const items = (result as { events?: unknown[]; concerts?: unknown[] }).events ?? (result as { events?: unknown[]; concerts?: unknown[] }).concerts;
        const newStatus: SnapshotStatus =
          !items || items.length === 0 ? 'empty' : (result as { stale?: boolean }).stale ? 'stale' : 'ready';

        if (cacheKey) {
          snapshotCache.set(cacheKey, { data: result, status: newStatus, timestamp: Date.now() });
        }

        if (!cancelled) {
          setData(result);
          setStatus(newStatus);
          setError(null);
        }
      } catch (err) {
        if (!cancelled && !hadCachedData) {
          setStatus('error');
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    fetchSnapshot();

    if (refreshIntervalMs && refreshIntervalMs > 0) {
      const interval = setInterval(fetchSnapshot, refreshIntervalMs);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, refreshIntervalMs]);

  return { data, status, error };
}
