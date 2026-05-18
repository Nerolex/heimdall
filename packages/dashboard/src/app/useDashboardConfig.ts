import { useEffect, useState } from 'react';
import type { DashboardConfig } from '@heimdall/shared';

export type AppState = 'loading' | 'ready' | 'empty' | 'error';

export function useDashboardConfig() {
  const [state, setState] = useState<AppState>('loading');
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(async (res) => {
        if (res.status === 404) {
          setState('empty');
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: 'Unknown error' }));
          setErrorMessage(body.message || `Server error: ${res.status}`);
          setState('error');
          return;
        }
        const data: DashboardConfig = await res.json();
        if (!data.views || data.views.length === 0) {
          setState('empty');
          return;
        }
        setConfig(data);
        setState('ready');
      })
      .catch((err) => {
        setErrorMessage(`Failed to connect to server: ${err.message}`);
        setState('error');
      });
  }, []);

  return { state, config, errorMessage };
}
