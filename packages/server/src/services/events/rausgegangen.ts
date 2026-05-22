import type { RawEventRecord } from '@heimdall/shared';

export class EventsScraperError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'EventsScraperError';
  }
}

export async function fetchCsrfCookie(
  city: string
): Promise<{ cookie: string; csrfToken: string }> {
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
  const csrfMatch = html.match(/<meta[^>]+name="csrf-token"[^>]+content="([^"]+)"/);
  if (!csrfMatch) throw new EventsScraperError('CSRF token not found in page');
  const csrfToken = csrfMatch[1];
  const setCookie = res.headers.get('set-cookie') ?? '';
  const cookie = setCookie.split(';')[0]?.trim() ?? '';
  if (!cookie) throw new EventsScraperError('Session cookie not found in response');
  return { cookie, csrfToken };
}

export async function searchEvents(
  cookie: string,
  csrfToken: string,
  city: string,
  lat: number,
  lng: number,
  date: string,
  limit: number,
  offset: number
): Promise<RawEventRecord[]> {
  let res: Response;
  try {
    res = await fetch('https://rausgegangen.de/api/v1/search', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lat, lng, city, date, limit, offset }),
    });
  } catch (err) {
    throw new EventsScraperError(
      `Network error during event search: ${(err as Error).message}`
    );
  }
  if (!res.ok) {
    throw new EventsScraperError(`Search API error: HTTP ${res.status}`, res.status);
  }
  const data = (await res.json()) as Record<string, unknown>[];
  return data.map(item => ({
    id: String(item.id ?? ''),
    title: String(item.title ?? ''),
    categorySlug: String(item.category_slug ?? ''),
    date: String(item.date ?? ''),
    description: String(item.description ?? ''),
    additionalInfos: item.additional_infos != null ? String(item.additional_infos) : null,
    slug: String(item.slug ?? ''),
  }));
}
