// paginateFetch is superseded by scrapeTimePage in rausgegangen.ts.
// Kept as a stub to avoid breaking any tests that may import it.
import type { RawEventRecord } from '@heimdall/shared';

export async function paginateFetch(
  _city: string,
  _lat: number,
  _lng: number,
  _windowStart: string,
  _windowEnd: string,
  _cookie: string,
  _csrfToken: string
): Promise<RawEventRecord[]> {
  return [];
}
