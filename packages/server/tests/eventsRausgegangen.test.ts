import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchCsrfCookie, searchEvents, EventsScraperError } from '../src/services/events/rausgegangen.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const mockHtml = '<html><head><meta name="csrf-token" content="test-csrf-123"></head></html>';

describe('fetchCsrfCookie', () => {
  it('extracts CSRF token and session cookie', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockHtml),
      headers: {
        get: (name: string) =>
          name === 'set-cookie' ? 'session=abc123; Path=/; HttpOnly' : null,
      },
    });
    const { cookie, csrfToken } = await fetchCsrfCookie('dortmund');
    expect(csrfToken).toBe('test-csrf-123');
    expect(cookie).toBe('session=abc123');
  });

  it('throws typed error on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
      headers: { get: () => null },
    });
    await expect(fetchCsrfCookie('unknown-city')).rejects.toThrow(EventsScraperError);
  });

  it('throws typed error on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(fetchCsrfCookie('dortmund')).rejects.toThrow(EventsScraperError);
  });
});

describe('searchEvents', () => {
  it('sends correct headers and maps response fields', async () => {
    const mockData = [
      {
        id: '1',
        title: 'Test Concert',
        category_slug: 'concerts-and-music',
        date: '2024-05-15',
        description: 'Venue | 8:00 PM',
        additional_infos: 'Every Friday',
        slug: 'test-concert',
      },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await searchEvents(
      'session=abc',
      'csrf-token',
      'dortmund',
      51.5,
      7.4,
      '2024-05-15',
      10,
      0
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://rausgegangen.de/api/v1/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Cookie: 'session=abc',
          'X-CSRF-Token': 'csrf-token',
        }),
      })
    );
    expect(result[0].categorySlug).toBe('concerts-and-music');
    expect(result[0].additionalInfos).toBe('Every Friday');
  });
});
