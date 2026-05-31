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
    // The href must be inside the tile-large div; outer </a></div> closes the wrapper.
    const html = `
      <div>
        <div class="tile-large">
          <a href="/en/events/test-concert/">
            <span class="text-sm">Sa, 18. Jan | 20:00</span>
            <h4 class="font-bold">Test Concert</h4>
            <span class="text-sm pr-1 opacity-70">Music Venue</span>
            <span class="event-text-pill-outline">Konzerte &amp; Musik</span>
          </a>
        </div>
        </a>
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
        <div class="tile-large">
          <a href="/en/events/no-title/">
            <span class="text-sm">Sa, 18. Jan | 20:00</span>
          </a>
        </div>
        </a>
      </div>
    `;
    expect(parseEventTiles(html)).toHaveLength(0);
  });
});
