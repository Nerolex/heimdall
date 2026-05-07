import * as fs from 'node:fs';
import {
  type DashboardConfig,
  isValidDashboardConfig,
  normalizeCycleInterval,
  normalizeViewOrder,
} from '@heimdall/shared';

export interface ConfigResult {
  config?: DashboardConfig;
  error?: 'config_not_found' | 'config_invalid';
  message?: string;
}

/**
 * Load and validate a dashboard config from a JSON file.
 * Returns normalized config or an error descriptor.
 */
export function loadConfig(configPath: string): ConfigResult {
  if (!fs.existsSync(configPath)) {
    return {
      error: 'config_not_found',
      message: 'No configuration file found. Create config.json in the project root.',
    };
  }

  let raw: string;
  try {
    raw = fs.readFileSync(configPath, 'utf-8');
  } catch (err) {
    return {
      error: 'config_invalid',
      message: `Configuration file could not be read: ${(err as Error).message}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      error: 'config_invalid',
      message: `Configuration file could not be parsed: ${(err as Error).message}`,
    };
  }

  if (!isValidDashboardConfig(parsed)) {
    return {
      error: 'config_invalid',
      message: 'Configuration file is invalid: "views" must be an array.',
    };
  }

  // Pass through extra config sections for view settings
  const extra = parsed as unknown as Record<string, unknown>;
  const config = {
    cycleInterval: normalizeCycleInterval(parsed.cycleInterval),
    viewOrder: normalizeViewOrder(parsed.viewOrder),
    views: parsed.views,
    ...(parsed.weather ? { weather: parsed.weather } : {}),
    ...(extra.showFullscreenButton != null ? { showFullscreenButton: extra.showFullscreenButton } : {}),
    ...(extra.keepAwake != null ? { keepAwake: extra.keepAwake } : {}),
    ...(extra.retro ? { retro: extra.retro } : {}),
    ...(extra.steam ? { steam: extra.steam } : {}),
    ...(extra.calendar ? { calendar: extra.calendar } : {}),
    ...(extra.lastfm ? { lastfm: extra.lastfm } : {}),
    ...(extra.plex ? { plex: extra.plex } : {}),
  } as DashboardConfig;

  return { config };
}
