/**
 * Hook to signal empty state for skipIfEmpty support
 */

import { useEffect } from 'react';
import type { ViewInternalSettings } from '../../../app/internalSettings';

type SnapshotStatus = 'loading' | 'success' | 'error' | 'empty';

export function useConcertsSkipEffect(
  status: SnapshotStatus,
  skipIfEmpty: boolean,
  onEmpty: ViewInternalSettings['__onEmpty']
): void {
  useEffect(() => {
    if (skipIfEmpty && (status === 'empty' || status === 'error') && onEmpty) {
      onEmpty();
    }
  }, [status, skipIfEmpty, onEmpty]);
}
