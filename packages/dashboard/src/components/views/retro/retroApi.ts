export const RA_MEDIA = '/api/retro/media';

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export interface RetroSettings {
  apiUser: string;
  apiKey: string;
  user?: string;
}

export function extractRetroSettings(settings: Record<string, unknown>): RetroSettings {
  const apiUser = settings.apiUser as string;
  const apiKey = settings.apiKey as string;
  const user = (settings.user as string) || apiUser;
  return { apiUser, apiKey, user };
}

/** Generic fetcher with polling for RetroAchievements API */
export function createRetroFetcher<T>(
  url: string,
  onData: (data: unknown) => T | null,
  setState: (val: T) => void,
  setLoading: (val: boolean) => void,
): { start: () => () => void } {
  return {
    start() {
      async function fetchData(): Promise<void> {
        try {
          const res = await fetch(url);
          const raw = await res.json();
          const result = onData(raw);
          if (result !== null) setState(result);
        } catch { /* ignore */ }
        setLoading(false);
      }
      fetchData();
      const interval = setInterval(fetchData, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    },
  };
}

export function timeAgo(dateStr: string): string {
  const d = new Date(dateStr + ' UTC');
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `vor ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours}h`;
  const days = Math.floor(hours / 24);
  return `vor ${days}d`;
}
