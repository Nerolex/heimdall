import { useEffect, useState } from 'react';
import type { EventsViewSnapshot } from '@heimdall/shared';

type SnapshotStatus = 'loading' | 'ready' | 'empty' | 'error' | 'stale';

export function useEventsSnapshot(
  viewType: string,
  days?: number
): { snapshot: EventsViewSnapshot | null; status: SnapshotStatus; error: string | null } {
  const [snapshot, setSnapshot] = useState<EventsViewSnapshot | null>(null);
  const [status, setStatus] = useState<SnapshotStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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
        setSnapshot(data);
        if (data.events.length === 0) {
          setStatus('empty');
        } else if (data.stale) {
          setStatus('stale');
        } else {
          setStatus('ready');
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setStatus('error');
        setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [viewType, days]);

  return { snapshot, status, error };
}
