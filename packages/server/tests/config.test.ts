import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../src/config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('node:fs');

describe('loadConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and parses a valid config file', () => {
    const validConfig = JSON.stringify({
      cycleInterval: 10,
      views: [{ type: 'image', settings: { src: '/assets/test.png' } }],
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(validConfig);

    const result = loadConfig('/fake/config.json');
    expect(result.config).toBeDefined();
    expect(result.config!.views).toHaveLength(1);
    expect(result.config!.cycleInterval).toBe(10);
    expect(result.error).toBeUndefined();
  });

  it('applies default cycleInterval when missing', () => {
    const config = JSON.stringify({ views: [{ type: 'image' }] });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(config);

    const result = loadConfig('/fake/config.json');
    expect(result.config!.cycleInterval).toBe(30);
  });

  it('applies default cycleInterval when invalid (zero or negative)', () => {
    const config = JSON.stringify({ cycleInterval: -5, views: [] });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(config);

    const result = loadConfig('/fake/config.json');
    expect(result.config!.cycleInterval).toBe(30);
  });

  it('loads grouped v2 config and maps provider sections to runtime shape', () => {
    const groupedConfig = JSON.stringify({
      schemaVersion: 2,
      app: {
        cycleInterval: 25,
        viewOrder: 'random',
        keepAwake: 'auto',
        showFullscreenButton: true,
      },
      providers: {
        weather: {
          apiKey: 'weather-key',
          city: 'Dortmund',
          units: 'metric',
        },
        calendar: {
          sources: [{ url: 'https://calendar.example.com/feed.ics', name: 'Main' }],
        },
        music: {
          lastfm: { apiKey: 'lastfm-key', user: 'listener' },
        },
        gaming: {
          retro: { apiUser: 'ra-api', apiKey: 'ra-key', user: 'ra-user' },
          steam: { apiKey: 'steam-key', steamId: 'steam-id' },
          igdb: { clientId: 'igdb-id', clientSecret: 'igdb-secret' },
          sgdb: { apiKey: 'sgdb-key' },
        },
        plex: { url: 'http://127.0.0.1:32400', token: 'plex-token' },
      },
      views: [{ type: 'weather' }],
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(groupedConfig);

    const result = loadConfig('/fake/config.json');
    expect(result.error).toBeUndefined();
    expect(result.config).toBeDefined();
    expect(result.config!.schemaVersion).toBe(2);
    expect(result.config!.cycleInterval).toBe(25);
    expect(result.config!.viewOrder).toBe('random');
    expect(result.config!.keepAwake).toBe('auto');
    expect(result.config!.showFullscreenButton).toBe(true);
    expect(result.config!.weather?.apiKey).toBe('weather-key');
    expect(result.config!.calendar?.sources[0]?.name).toBe('Main');
    expect(result.config!.lastfm?.apiKey).toBe('lastfm-key');
    expect(result.config!.steam?.steamId).toBe('steam-id');
    expect(result.config!.retro?.apiUser).toBe('ra-api');
    expect(result.config!.retro?.igdbClientId).toBe('igdb-id');
    expect(result.config!.retro?.igdbClientSecret).toBe('igdb-secret');
    expect(result.config!.retro?.sgdbApiKey).toBe('sgdb-key');
    expect(result.config!.plex?.token).toBe('plex-token');
  });

  it('returns config_not_found error when file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = loadConfig('/fake/config.json');
    expect(result.config).toBeUndefined();
    expect(result.error).toBe('config_not_found');
  });

  it('returns config_invalid error for malformed JSON', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{ not valid json }');

    const result = loadConfig('/fake/config.json');
    expect(result.config).toBeUndefined();
    expect(result.error).toBe('config_invalid');
    expect(result.message).toBeDefined();
  });

  it('returns config_invalid error when views is not an array', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ views: 'not array' }));

    const result = loadConfig('/fake/config.json');
    expect(result.config).toBeUndefined();
    expect(result.error).toBe('config_invalid');
  });
});
