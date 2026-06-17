import { useEffect, useState } from 'react';
import type { DashboardConfig } from '@heimdall/shared';

export type AppState = 'loading' | 'ready' | 'empty' | 'error';

interface ConfigFetchResult {
  state: Exclude<AppState, 'loading'>;
  config?: DashboardConfig;
  errorMessage?: string;
}

async function fetchDashboardConfig(): Promise<ConfigFetchResult> {
  // Read profile from URL query params
  const params = new URLSearchParams(window.location.search);
  const profile = params.get('profile');
  
  // Build API URL with optional profile parameter
  const apiUrl = profile ? `/api/config?profile=${encodeURIComponent(profile)}` : '/api/config';
  
  let res: Response;
  try {
    res = await fetch(apiUrl);
  } catch (err) {
    return { state: 'error', errorMessage: `Failed to connect to server: ${(err as Error).message}` };
  }

  if (res.status === 404) return { state: 'empty' };

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unknown error' }));
    return { state: 'error', errorMessage: body.message || `Server error: ${res.status}` };
  }

  const data: DashboardConfig = await res.json();
  if (!data.views || data.views.length === 0) return { state: 'empty' };

  return { state: 'ready', config: data };
}

export function useDashboardConfig() {
  const [state, setState] = useState<AppState>('loading');
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchDashboardConfig().then(({ state: nextState, config: nextConfig, errorMessage: msg }) => {
      if (nextConfig) setConfig(nextConfig);
      if (msg) setErrorMessage(msg);
      setState(nextState);
    });
  }, []);

  // Get current profile from URL
  const params = new URLSearchParams(window.location.search);
  const profile = params.get('profile') || 'default';

  return { state, config, errorMessage, profile };
}
