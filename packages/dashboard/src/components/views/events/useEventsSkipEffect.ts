import { useEffect } from 'react';
import type { EventsSnapshotStatus } from './useEventsSnapshot';

/**
 * Shared hook that triggers `onEmpty` when the snapshot status is empty or errored
 * and `skipIfEmpty` is enabled. Used by all event views so skip behaviour is consistent.
 */
export function useEventsSkipEffect(
  status: EventsSnapshotStatus,
  skipIfEmpty: boolean,
  onEmpty: (() => void) | undefined,
): void {
  useEffect(() => {
    if ((status === 'empty' || status === 'error') && skipIfEmpty && onEmpty) {
      onEmpty();
    }
  }, [status, skipIfEmpty, onEmpty]);
}
