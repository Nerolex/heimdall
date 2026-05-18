import type { DashboardConfig, OverlayMode } from '@heimdall/shared';
import { normalizeOverlayMode } from '@heimdall/shared';

/** Merge top-level config sections into view settings so views inherit shared credentials */
export function mergeViewSettings(config: DashboardConfig, view: DashboardConfig['views'][number]): Record<string, unknown> {
  const base = view.settings || {};
  const type = view.type;
  const cfg = config as unknown as Record<string, unknown>;
  if (type.startsWith('retro') && cfg.retro) {
    return { ...(cfg.retro as Record<string, unknown>), ...base };
  }
  if (type.startsWith('gaming')) {
    const retro = (cfg.retro as Record<string, unknown>) || {};
    const steam = (cfg.steam as Record<string, unknown>) || {};
    return {
      raApiUser: retro.apiUser,
      raApiKey: retro.apiKey,
      raUser: retro.user,
      steamApiKey: steam.apiKey,
      steamId: steam.steamId,
      igdbClientId: retro.igdbClientId,
      igdbClientSecret: retro.igdbClientSecret,
      sgdbApiKey: retro.sgdbApiKey,
      ...base,
    };
  }
  if (type.startsWith('calendar') && cfg.calendar) {
    return { ...(cfg.calendar as Record<string, unknown>), ...base };
  }
  if (type.startsWith('music') && cfg.lastfm) {
    const lastfm = cfg.lastfm as Record<string, unknown>;
    return { lastfmApiKey: lastfm.apiKey, lastfmUser: lastfm.user, ...base };
  }
  if (type.startsWith('weather') && config.weather) {
    return { ...(config.weather as unknown as Record<string, unknown>), ...base };
  }
  if (type === 'clock' && config.weather) {
    const w = config.weather as unknown as Record<string, unknown>;
    return { weatherApiKey: w.apiKey, weatherCity: w.city, weatherUnits: w.units, ...base };
  }
  return base as Record<string, unknown>;
}

export function getOverlayMode(config: DashboardConfig, index: number): OverlayMode {
  return normalizeOverlayMode(config.views[index]?.overlay);
}

export function showsClock(mode: OverlayMode): boolean {
  return mode === 'both' || mode === 'clock';
}

export function showsWeather(mode: OverlayMode): boolean {
  return mode === 'both' || mode === 'weather';
}
