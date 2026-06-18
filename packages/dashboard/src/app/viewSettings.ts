import type { DashboardConfig, OverlayMode } from '@heimdall/shared';
import { normalizeOverlayMode } from '@heimdall/shared';

/** Merge top-level config sections into view settings so views inherit shared credentials */
export function mergeViewSettings(config: DashboardConfig, view: DashboardConfig['views'][number]): Record<string, unknown> {
  const base = (view.settings || {}) as Record<string, unknown>;
  const type = view.type;

  if (type.startsWith('retro') && config.retro) {
    return { ...config.retro, ...base };
  }
  if (type.startsWith('gaming')) {
    return {
      raApiUser: config.retro?.apiUser,
      raApiKey: config.retro?.apiKey,
      raUser: config.retro?.user,
      steamApiKey: config.steam?.apiKey,
      steamId: config.steam?.steamId,
      igdbClientId: config.igdb?.clientId,
      igdbClientSecret: config.igdb?.clientSecret,
      sgdbApiKey: config.sgdb?.apiKey,
      ...base,
    };
  }
  if (type.startsWith('calendar') && config.calendar) {
    return { ...config.calendar, ...base };
  }
  if (type.startsWith('music') && config.lastfm) {
    return { lastfmApiKey: config.lastfm.apiKey, lastfmUser: config.lastfm.user, ...base };
  }
  if (type.startsWith('weather') && config.weather) {
    return { ...config.weather, ...base };
  }
  if (type === 'clock' && config.weather) {
    return {
      weatherApiKey: config.weather.apiKey,
      weatherCity: config.weather.city,
      weatherUnits: config.weather.units,
      weatherRefreshInterval: config.weather.refreshIntervalMinutes,
      ...base,
    };
  }
  return base;
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
