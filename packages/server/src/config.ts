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

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getObject(value: unknown): JsonObject | undefined {
  return isObject(value) ? value : undefined;
}

function normalizeGroupedShape(parsed: JsonObject): JsonObject {
  const app = getObject(parsed.app);
  const providers = getObject(parsed.providers);
  const music = getObject(providers?.music);
  const gaming = getObject(providers?.gaming);
  const weather = getObject(providers?.weather) ?? getObject(parsed.weather);
  const calendar = getObject(providers?.calendar) ?? getObject(parsed.calendar);
  const lastfm = getObject(music?.lastfm) ?? getObject(parsed.lastfm);
  const steam = getObject(gaming?.steam) ?? getObject(parsed.steam);
  const plex = getObject(providers?.plex) ?? getObject(parsed.plex);
  const legacyRetro = getObject(parsed.retro);
  const groupedRetro = getObject(gaming?.retro);
  const igdb = getObject(gaming?.igdb);
  const sgdb = getObject(gaming?.sgdb);
  const retro = {
    ...(legacyRetro || {}),
    ...(groupedRetro || {}),
    ...(igdb?.clientId != null ? { igdbClientId: igdb.clientId } : {}),
    ...(igdb?.clientSecret != null ? { igdbClientSecret: igdb.clientSecret } : {}),
    ...(sgdb?.apiKey != null ? { sgdbApiKey: sgdb.apiKey } : {}),
  };

  return {
    schemaVersion: parsed.schemaVersion,
    cycleInterval: app?.cycleInterval ?? parsed.cycleInterval,
    viewOrder: app?.viewOrder ?? parsed.viewOrder,
    keepAwake: app?.keepAwake ?? parsed.keepAwake,
    showFullscreenButton: app?.showFullscreenButton ?? parsed.showFullscreenButton,
    views: parsed.views,
    ...(weather ? { weather } : {}),
    ...(calendar ? { calendar } : {}),
    ...(lastfm ? { lastfm } : {}),
    ...(Object.keys(retro).length > 0 ? { retro } : {}),
    ...(steam ? { steam } : {}),
    ...(plex ? { plex } : {}),
  };
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

  if (!isObject(parsed)) {
    return {
      error: 'config_invalid',
      message: 'Configuration file is invalid: root must be a JSON object.',
    };
  }

  const normalizedParsed = normalizeGroupedShape(parsed);

  if (!isValidDashboardConfig(normalizedParsed)) {
    return {
      error: 'config_invalid',
      message: 'Configuration file is invalid: "views" must be an array.',
    };
  }

  const config: DashboardConfig = {
    ...(typeof normalizedParsed.schemaVersion === 'number' ? { schemaVersion: normalizedParsed.schemaVersion } : {}),
    cycleInterval: normalizeCycleInterval(normalizedParsed.cycleInterval),
    viewOrder: normalizeViewOrder(normalizedParsed.viewOrder),
    views: normalizedParsed.views as DashboardConfig['views'],
    ...(normalizedParsed.weather ? { weather: normalizedParsed.weather as DashboardConfig['weather'] } : {}),
    ...(normalizedParsed.showFullscreenButton != null ? { showFullscreenButton: normalizedParsed.showFullscreenButton as boolean } : {}),
    ...(normalizedParsed.keepAwake != null ? { keepAwake: normalizedParsed.keepAwake } : {}),
    ...(normalizedParsed.retro ? { retro: normalizedParsed.retro } : {}),
    ...(normalizedParsed.steam ? { steam: normalizedParsed.steam } : {}),
    ...(normalizedParsed.calendar ? { calendar: normalizedParsed.calendar } : {}),
    ...(normalizedParsed.lastfm ? { lastfm: normalizedParsed.lastfm } : {}),
    ...(normalizedParsed.plex ? { plex: normalizedParsed.plex } : {}),
  } as DashboardConfig;

  return { config };
}
