import { useEffect } from 'react';
import type { SnapshotStatus } from './useViewSnapshot';

/**
 * Calls `onEmpty` when the snapshot is empty or errored and `skipIfEmpty` is enabled.
 * This lets the view cycle automatically skip views with no content.
 */
export function useViewSkipEffect(
  status: SnapshotStatus,
  skipIfEmpty: boolean,
  onEmpty: (() => void) | undefined,
): void {
  useEffect(() => {
    if ((status === 'empty' || status === 'error') && skipIfEmpty && onEmpty) {
      onEmpty();
    }
  }, [status, skipIfEmpty, onEmpty]);
}
