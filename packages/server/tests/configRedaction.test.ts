import { describe, expect, it } from 'vitest';
import { redactConfigForClient } from '../src/configRedaction.js';

describe('redactConfigForClient', () => {
  it('strips sensitive fields and keeps non-sensitive settings', () => {
    const input = {
      cycleInterval: 15,
      views: [{ type: 'image', settings: { src: '/assets/a.png' } }],
      weather: { apiKey: 'weather-secret', city: 'Berlin', units: 'metric' },
      lastfm: { apiKey: 'lastfm-secret', user: 'mike' },
      retro: {
        apiUser: 'retro-api-user',
        apiKey: 'retro-secret',
        user: 'retro-user',
      },
      igdb: {
        clientId: 'igdb-id',
        clientSecret: 'igdb-secret',
      },
      sgdb: {
        apiKey: 'sgdb-secret',
      },
      steam: { apiKey: 'steam-secret', steamId: '123' },
      plex: { url: 'http://127.0.0.1:32400', token: 'plex-secret' },
    } as never;

    const redacted = redactConfigForClient(input);

    expect(redacted.weather?.city).toBe('Berlin');
    expect(redacted.weather?.apiKey).toBe('weather-secret');
    expect(redacted.lastfm?.user).toBe('mike');
    expect((redacted.lastfm as Record<string, unknown>).apiKey).toBeUndefined();
    expect((redacted.retro as Record<string, unknown>).apiUser).toBe('retro-api-user');
    expect((redacted.retro as Record<string, unknown>).apiKey).toBeUndefined();
    expect((redacted.igdb as Record<string, unknown>).clientSecret).toBeUndefined();
    expect((redacted.sgdb as Record<string, unknown>).apiKey).toBeUndefined();
    expect((redacted.steam as Record<string, unknown>).steamId).toBe('123');
    expect((redacted.steam as Record<string, unknown>).apiKey).toBeUndefined();
    expect((redacted.plex as Record<string, unknown>).url).toBe('http://127.0.0.1:32400');
    expect((redacted.plex as Record<string, unknown>).token).toBeUndefined();
  });
});
