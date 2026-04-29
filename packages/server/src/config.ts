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

  // Normalize values
  const config: DashboardConfig = {
    cycleInterval: normalizeCycleInterval(parsed.cycleInterval),
    viewOrder: normalizeViewOrder(parsed.viewOrder),
    views: parsed.views,
    ...(parsed.weather ? { weather: parsed.weather } : {}),
    ...(parsed.showFullscreenButton != null ? { showFullscreenButton: parsed.showFullscreenButton } : {}),
  };

  return { config };
}
