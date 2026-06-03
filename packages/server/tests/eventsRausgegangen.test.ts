import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchCsrfCookie, parseEventTiles, EventsScraperError } from '../src/services/events/rausgegangen.js';

afterEach(() => {
  vi.restoreAllMocks();
});

// Minimal HTML that matches the hx-headers CSRF token pattern fetchCsrfCookie expects
const mockHtml = `<body hx-headers='{"X-CSRFToken": "test-csrf-123"}'></body>`;

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

describe('parseEventTiles', () => {
  it('extracts slug, title, category, and description from tile HTML', () => {
    const html = `
      <div>
        <div class="tile tile-large hover-lift">
          <a class="event-tile" href="/en/events/test-concert/">
            <div class="flex-1 min-h-0">
              <p class="mb-0 min-w-0 flex-1 truncate text-sm">
                <span class="font-bold">Sa, 18. Jan | </span>
                <span>20:00</span>
              </p>
              <span class="h5 break-words line-clamp-2">Test Concert</span>
              <p class="text-sm opacity-70 leading-5 mb-0 truncate">Music Venue</p>
              <span class="da-badge da-badge-sm da-badge-info">Konzerte &amp; Musik</span>
            </div>
          </a>
        </div>
      </div>
    `;
    const results = parseEventTiles(html);
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('test-concert');
    expect(results[0].title).toBe('Test Concert');
    expect(results[0].categorySlug).toBe('concerts-and-music');
    expect(results[0].description).toContain('Music Venue');
  });

  it('skips tiles without a title or date', () => {
    const html = `
      <div>
        <div class="tile tile-large hover-lift">
          <a class="event-tile" href="/en/events/no-title/">
            <p class="text-sm opacity-70 leading-5 mb-0 truncate">Some Venue</p>
          </a>
        </div>
      </div>
    `;
    expect(parseEventTiles(html)).toHaveLength(0);
  });
});
