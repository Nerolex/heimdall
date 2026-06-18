import * as fs from 'node:fs';
import {
  type DashboardConfig,
  type EventsProviderConfig,
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

function normalizeEventsProvider(raw: unknown): EventsProviderConfig | null {
  if (!isObject(raw)) return null;
  
  // Support both old "city" and new "cities" field
  const cities = raw.cities ?? raw.city;
  
  // Validate cities format
  if (typeof cities === 'string') {
    if (cities.trim() === '') return null;
  } else if (Array.isArray(cities)) {
    if (cities.length === 0) return null;
    if (!cities.every(c => typeof c === 'string' && c.trim() !== '')) return null;
  } else {
    return null;
  }
  
  const rawCategories = Array.isArray(raw.categories) ? raw.categories : [];
  const categories = rawCategories
    .filter((c): c is string => typeof c === 'string')
    .map(c => c.toLowerCase().trim())
    .filter(c => c !== 'available-anytime');
  
  return { 
    cities: typeof cities === 'string' ? cities.trim() : cities.map(c => c.trim()),
    categories 
  };
}

function normalizeWeatherConfig(raw: JsonObject): JsonObject {
  const result = { ...raw };
  if (raw.refreshInterval != null && raw.refreshIntervalMinutes == null) {
    result.refreshIntervalMinutes = raw.refreshInterval;
  }
  delete result.refreshInterval;
  return result;
}

function normalizeConcertsConfig(raw: JsonObject): JsonObject {
  const result = { ...raw };
  if (raw.refreshInterval != null && raw.refreshIntervalHours == null) {
    result.refreshIntervalHours = raw.refreshInterval;
  }
  delete result.refreshInterval;
  return result;
}

const KNOWN_OVERLAY_MODES = new Set(['both', 'clock', 'weather', 'none']);
const KNOWN_FREQUENCIES = new Set(['high', 'normal', 'low']);

function isValidViewEntryShape(raw: unknown): string | null {
  if (!isObject(raw)) return 'Each view entry must be a JSON object';
  if (typeof raw.type !== 'string' || raw.type.trim() === '') {
    return 'Each view entry must have a non-empty "type" string';
  }
  if (raw.overlay != null && !KNOWN_OVERLAY_MODES.has(raw.overlay as string)) {
    return `View "${raw.type}": invalid overlay "${raw.overlay}" (valid: both, clock, weather, none)`;
  }
  if (raw.frequency != null && !KNOWN_FREQUENCIES.has(raw.frequency as string)) {
    return `View "${raw.type}": invalid frequency "${raw.frequency}" (valid: high, normal, low)`;
  }
  return null;
}

function normalizeGroupedShape(parsed: JsonObject): JsonObject {
  const app = getObject(parsed.app);
  const providers = getObject(parsed.providers);
  const music = getObject(providers?.music);
  const gaming = getObject(providers?.gaming);
  const rawWeather = getObject(providers?.weather) ?? getObject(parsed.weather);
  const weather = rawWeather ? normalizeWeatherConfig(rawWeather) : undefined;
  const calendar = getObject(providers?.calendar) ?? getObject(parsed.calendar);
  const lastfm = getObject(music?.lastfm) ?? getObject(parsed.lastfm);
  const steam = getObject(gaming?.steam) ?? getObject(parsed.steam);
  const plex = getObject(providers?.plex) ?? getObject(parsed.plex);
  const eventsProvider = getObject(providers?.events);
  const rawConcerts = normalizeConcertsConfig(getObject(providers?.concerts) ?? {});
  const concertsProvider = Object.keys(rawConcerts).length > 0 ? rawConcerts : undefined;
  const retro = getObject(gaming?.retro) ?? getObject(parsed.retro);
  const igdb = getObject(gaming?.igdb);
  const sgdb = getObject(gaming?.sgdb);

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
    ...(retro ? { retro } : {}),
    ...(steam ? { steam } : {}),
    ...(igdb ? { igdb } : {}),
    ...(sgdb ? { sgdb } : {}),
    ...(plex ? { plex } : {}),
    ...(eventsProvider || concertsProvider ? { 
      providers: { 
        ...(eventsProvider ? { events: eventsProvider } : {}),
        ...(concertsProvider ? { concerts: concertsProvider } : {}),
      } 
    } : {}),
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

  // Validate each view entry before proceeding
  const rawViews = Array.isArray(normalizedParsed.views) ? normalizedParsed.views : [];
  for (let i = 0; i < rawViews.length; i++) {
    const error = isValidViewEntryShape(rawViews[i]);
    if (error) {
      return {
        error: 'config_invalid',
        message: `View entry [${i}]: ${error}`,
      };
    }
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
    ...(normalizedParsed.igdb ? { igdb: normalizedParsed.igdb } : {}),
    ...(normalizedParsed.sgdb ? { sgdb: normalizedParsed.sgdb } : {}),
    ...(normalizedParsed.calendar ? { calendar: normalizedParsed.calendar } : {}),
    ...(normalizedParsed.lastfm ? { lastfm: normalizedParsed.lastfm } : {}),
    ...(normalizedParsed.plex ? { plex: normalizedParsed.plex } : {}),
  } as DashboardConfig;

  // Validate and normalize events provider if present
  if (normalizedParsed.providers) {
    const rawProviders = normalizedParsed.providers as Record<string, unknown>;
    const normalizedEvents = normalizeEventsProvider(rawProviders.events);
    if (normalizedEvents || rawProviders.concerts) {
      config.providers = {
        ...(normalizedEvents ? { events: normalizedEvents } : {}),
        ...(rawProviders.concerts ? { concerts: rawProviders.concerts as any } : {}),
      };
    }
  }

  return { config };
}
