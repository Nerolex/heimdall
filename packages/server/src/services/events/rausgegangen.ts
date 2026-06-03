import type { RawEventRecord } from '@heimdall/shared';

export class EventsScraperError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'EventsScraperError';
  }
}

// Map German category labels returned in HTML tiles to English config slugs
const CATEGORY_SLUG_MAP: Record<string, string> = {
  'konzerte & musik': 'concerts-and-music',
  'party': 'party',
  'theater': 'theater',
  'festivals': 'festivals',
  'ausstellungen': 'exhibition',
  'sport': 'sports',
  'film': 'film',
  'essen & trinken': 'food-and-drinks',
  'märkte': 'market',
  'shows & performances': 'shows-and-performances',
  'spoken word': 'spoken-word',
  'kinder & familien': 'children-and-families',
  'aktiv & kreativ': 'active-and-creative',
  'gesprochenes': 'spoken-word',
};

// German and English short month names → zero-padded numeric month
const MONTH_MAP: Record<string, string> = {
  // German
  jan: '01', feb: '02', 'mär': '03', mar: '03', apr: '04',
  mai: '05', jun: '06', jul: '07', aug: '08', sep: '09',
  okt: '10', nov: '11', dez: '12',
  // English (rausgegangen /en/ pages)
  may: '05', oct: '10', dec: '12',
};

function categoryToSlug(label: string): string {
  const key = label.toLowerCase().trim().replace(/&amp;/g, '&');
  return CATEGORY_SLUG_MAP[key] ?? key.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Parse tile date text like "Today, 22. Mai | 15:00" or "Sa, 23. Mai | 22:30"
 * Returns { date: "YYYY-MM-DD", time: "HH:MM" }
 */
function parseTileDateText(text: string, now: Date): { date: string; time: string } {
  const timeMatch = text.match(/(\d{1,2}:\d{2})\s*$/);
  const time = timeMatch?.[1] ?? '';
  const dayMonthMatch = text.match(/(\d{1,2})\.\s*([A-Za-zä]{3})/);
  if (!dayMonthMatch) return { date: '', time };
  const day = dayMonthMatch[1].padStart(2, '0');
  const monthKey = dayMonthMatch[2].toLowerCase();
  const month = MONTH_MAP[monthKey];
  if (!month) return { date: '', time };
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  // Roll over to next year when the event month is earlier than last month
  const year = parseInt(month) < currentMonth - 1 ? currentYear + 1 : currentYear;
  return { date: `${year}-${month}-${day}`, time };
}

/** Decode basic HTML entities in a string */
function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Fetch city page to harvest CSRF cookie + token.
 * The CSRF token sits in hx-headers on <body>: hx-headers='{"X-CSRFToken": "..."}'
 * All Set-Cookie values are returned joined for use as a Cookie header.
 */
export async function fetchCsrfCookie(
  city: string
): Promise<{ cookie: string; csrfToken: string; html: string }> {
  let res: Response;
  try {
    res = await fetch(`https://rausgegangen.de/en/${city}/`);
  } catch (err) {
    throw new EventsScraperError(
      `Network error fetching CSRF for city "${city}": ${(err as Error).message}`
    );
  }
  if (res.status === 404) {
    throw new EventsScraperError(`City not found: "${city}"`, 404);
  }
  if (!res.ok) {
    throw new EventsScraperError(`Failed to fetch city page: HTTP ${res.status}`, res.status);
  }
  const html = await res.text();

  // Token is in hx-headers on <body>: hx-headers='{"X-CSRFToken": "..."}'
  let csrfToken: string | undefined;
  const hxMatch = html.match(/hx-headers='[^']*"X-CSRFToken"\s*:\s*"([^"]+)"/);
  if (hxMatch) {
    csrfToken = hxMatch[1];
  } else {
    const jsMatch = html.match(/'X-CSRFToken'\s*:\s*[^']*'([A-Za-z0-9_-]{20,})'/);
    csrfToken = jsMatch?.[1];
  }
  if (!csrfToken) throw new EventsScraperError('CSRF token not found in page');

  // Collect all Set-Cookie name=value pairs joined for Cookie header
  const rawSetCookie = (res.headers as unknown as { getSetCookie?: () => string[] })
    .getSetCookie?.() ?? [res.headers.get('set-cookie') ?? ''];
  const cookiePairs = rawSetCookie
    .map(h => h.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
  if (!cookiePairs) throw new EventsScraperError('Session cookie not found in response');
  return { cookie: cookiePairs, csrfToken, html };
}

/**
 * Scrape event tiles from a time-specific rausgegangen page.
 * pageSlug: "tipps-fuer-heute" | "tips-for-the-weekend" | "tips-for-tomorrow"
 */
export async function scrapeTimePage(
  city: string,
  cookies: string,
  pageSlug: string
): Promise<RawEventRecord[]> {
  let res: Response;
  const url = `https://rausgegangen.de/en/${city}/${pageSlug}/`;
  try {
    res = await fetch(url, {
      headers: {
        Cookie: cookies,
        'User-Agent': 'Mozilla/5.0 (compatible; Heimdall/1.0)',
        Accept: 'text/html',
      },
    });
  } catch (err) {
    throw new EventsScraperError(
      `Network error fetching page "${pageSlug}": ${(err as Error).message}`
    );
  }
  if (!res.ok) {
    throw new EventsScraperError(`Page fetch error: HTTP ${res.status}`, res.status);
  }
  const html = await res.text();
  return parseEventTiles(html);
}

/**
 * Parse event tiles from rausgegangen HTML.
 * Each tile contains: href (slug), date span, title span, venue p, category badge.
 */
export function parseEventTiles(html: string): RawEventRecord[] {
  const now = new Date();
  const events: RawEventRecord[] = [];

  // Match each tile-large block (new markup: "tile tile-large hover-lift")
  const tileRegex = /<div class="tile tile-large hover-lift">([\s\S]*?)<\/a>\s*<\/div>/g;
  let match: RegExpExecArray | null;

  while ((match = tileRegex.exec(html)) !== null) {
    const tile = match[0];

    // href → slug
    const hrefMatch = tile.match(/href="\/en\/events\/([^/"]+)\//);
    if (!hrefMatch) continue;
    const slug = hrefMatch[1];

    // Date text: <span class="font-bold">Today, 03. Jun | </span> + <span>18:00</span>
    const dateBoldMatch = tile.match(/<span class="font-bold">([^<]+)<\/span>/);
    const timeSpanMatch = tile.match(/<span class="font-bold">[^<]*<\/span>\s*<span>(\d{1,2}:\d{2})<\/span>/);
    const dateText = (dateBoldMatch?.[1]?.trim() ?? '') + (timeSpanMatch?.[1] ? ` ${timeSpanMatch[1]}` : '');
    const { date, time } = parseTileDateText(dateText, now);

    // Title: <span class="h5 break-words line-clamp-2">Title</span>
    const titleMatch = tile.match(/<span class="h5 break-words line-clamp-2">\s*([^<]+?)\s*<\/span>/);
    const title = decodeHtml(titleMatch?.[1]?.trim() ?? '');

    // Venue: <p class="text-sm opacity-70 leading-5 mb-0 truncate">Venue</p>
    const venueMatch = tile.match(/<p class="text-sm opacity-70 leading-5 mb-0 truncate">([^<]+)<\/p>/);
    const venue = decodeHtml(venueMatch?.[1]?.trim() ?? '');

    // Category: <span class="da-badge da-badge-sm da-badge-*">Category</span>
    const catMatch = tile.match(/da-badge da-badge-sm da-badge-[^"]*">([^<]+)<\/span>/);
    const categoryLabel = decodeHtml(catMatch?.[1]?.trim() ?? '');

    // Image: <img src="..." class="w-full h-full object-cover object-center" />
    let imageUrl: string | undefined;
    const imgMatch = tile.match(/<img\s[^>]*src="([^"]+)"[^>]*class="w-full h-full object-cover/);
    if (imgMatch) {
      imageUrl = decodeHtml(imgMatch[1])
        .replace(/[?&]width=\d+/, '?width=1920')
        .replace(/[?&]height=\d+/, '&height=1080');
    }

    if (!title || !date) continue;

    const [year, month, day] = date.split('-');
    const dateFormatted = `${day}.${month}.${year}`;
    const description = venue ? `${venue} | ${dateFormatted} ${time}`.trim() : `${dateFormatted} ${time}`.trim();

    events.push({
      id: slug,
      title,
      categorySlug: categoryToSlug(categoryLabel),
      categoryLabelRaw: categoryLabel,
      date,
      description,
      additionalInfos: null,
      slug,
      imageUrl,
    });
  }

  return events;
}
