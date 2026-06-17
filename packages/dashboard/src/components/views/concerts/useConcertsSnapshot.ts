/**
 * Custom hook to fetch concerts snapshot from the API
 */

import { useEffect, useState } from 'react';
import type { ConcertsViewSnapshot } from '@heimdall/shared';

type SnapshotStatus = 'loading' | 'success' | 'error' | 'empty';

interface UseConcertsSnapshotResult {
  snapshot: ConcertsViewSnapshot | null;
  status: SnapshotStatus;
}

export function useConcertsSnapshot(): UseConcertsSnapshotResult {
  const [snapshot, setSnapshot] = useState<ConcertsViewSnapshot | null>(null);
  const [status, setStatus] = useState<SnapshotStatus>('loading');

  useEffect(() => {
    let mounted = true;

    const fetchSnapshot = async () => {
      try {
        const res = await fetch('/api/concerts/snapshot');
        
        if (!mounted) return;

        if (!res.ok) {
          if (res.status === 422 || res.status === 404) {
            setStatus('empty');
          } else {
            setStatus('error');
          }
          return;
        }

        const data: ConcertsViewSnapshot = await res.json();
        setSnapshot(data);
        setStatus(data.concerts.length === 0 ? 'empty' : 'success');
      } catch (error) {
        if (mounted) {
          console.error('[concerts] Failed to fetch snapshot:', error);
          setStatus('error');
        }
      }
    };

    fetchSnapshot();

    // Refresh every 30 minutes
    const interval = setInterval(fetchSnapshot, 30 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { snapshot, status };
}
