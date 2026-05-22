import type { RawEventRecord } from '@heimdall/shared';
import { searchEvents } from './rausgegangen.js';

export async function paginateFetch(
  city: string,
  lat: number,
  lng: number,
  windowStart: string,
  windowEnd: string,
  cookie: string,
  csrfToken: string
): Promise<RawEventRecord[]> {
  const all: RawEventRecord[] = [];
  let offset = 0;
  const limit = 10;
  const maxTotal = 50;

  while (all.length < maxTotal) {
    const page = await searchEvents(cookie, csrfToken, city, lat, lng, windowStart, limit, offset);
    if (page.length === 0) break;
    all.push(...page);
    const lastDate = page[page.length - 1].date;
    if (lastDate > windowEnd) break;
    if (page.length < limit) break;
    offset += limit;
  }

  return all;
}
