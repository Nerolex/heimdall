import type { DashboardConfig } from '@heimdall/shared';

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as T;
}

/**
 * Redact sensitive credentials from config payloads returned to clients.
 * Frontend no longer needs credentials — gaming/retro/steam/igdb/sgdb routes
 * read them from the server-side config on each request.
 */
export function redactConfigForClient(config: DashboardConfig): DashboardConfig {
  const cfg = config as DashboardConfig & Record<string, unknown>;
  const weather = cfg.weather ? stripUndefined({
    ...cfg.weather,
    apiKey: undefined,
  }) : undefined;
  const lastfm = cfg.lastfm ? stripUndefined({
    ...cfg.lastfm,
    apiKey: undefined,
  }) : undefined;
  const steam = cfg.steam ? stripUndefined({
    ...cfg.steam,
    apiKey: undefined,
  }) : undefined;
  const retro = cfg.retro ? stripUndefined({
    ...cfg.retro,
    apiKey: undefined,
  }) : undefined;
  const igdb = cfg.igdb ? stripUndefined({
    ...cfg.igdb,
    clientSecret: undefined,
  }) : undefined;
  const sgdb = cfg.sgdb ? stripUndefined({
    ...cfg.sgdb,
    apiKey: undefined,
  }) : undefined;
  const plex = cfg.plex ? stripUndefined({
    ...cfg.plex,
    token: undefined,
  }) : undefined;

  return {
    ...cfg,
    ...(weather ? { weather } : {}),
    ...(lastfm ? { lastfm } : {}),
    ...(steam ? { steam } : {}),
    ...(retro ? { retro } : {}),
    ...(igdb ? { igdb } : {}),
    ...(sgdb ? { sgdb } : {}),
    ...(plex ? { plex } : {}),
  } as DashboardConfig;
}
