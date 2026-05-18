import { describe, expect, it } from 'vitest';
import type { DashboardConfig } from '@heimdall/shared';
import { getOverlayMode, mergeViewSettings, showsClock, showsWeather } from '../../src/app/viewSettings';

describe('viewSettings helpers', () => {
  it('merges gaming credentials from top-level config into view settings', () => {
    const config = {
      views: [{ type: 'gaming-now', settings: { custom: 'value' } }],
      retro: {
        apiUser: 'ra-api-user',
        apiKey: 'ra-api-key',
        user: 'ra-user',
        igdbClientId: 'igdb-id',
        igdbClientSecret: 'igdb-secret',
        sgdbApiKey: 'sgdb-key',
      },
      steam: {
        apiKey: 'steam-key',
        steamId: 'steam-id',
      },
    } as unknown as DashboardConfig;

    const merged = mergeViewSettings(config, config.views[0]!);
    expect(merged.raApiUser).toBe('ra-api-user');
    expect(merged.raApiKey).toBe('ra-api-key');
    expect(merged.raUser).toBe('ra-user');
    expect(merged.igdbClientId).toBe('igdb-id');
    expect(merged.igdbClientSecret).toBe('igdb-secret');
    expect(merged.sgdbApiKey).toBe('sgdb-key');
    expect(merged.steamApiKey).toBe('steam-key');
    expect(merged.steamId).toBe('steam-id');
    expect(merged.custom).toBe('value');
  });

  it('maps overlay mode and visibility flags correctly', () => {
    const config = {
      views: [{ type: 'clock', overlay: 'weather' }],
    } as unknown as DashboardConfig;

    const mode = getOverlayMode(config, 0);
    expect(mode).toBe('weather');
    expect(showsClock(mode)).toBe(false);
    expect(showsWeather(mode)).toBe(true);
  });
});
