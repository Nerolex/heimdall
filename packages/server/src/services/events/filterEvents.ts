import type { RawEventRecord } from '@heimdall/shared';

export function filterByWindow(
  events: RawEventRecord[],
  windowStart: string,
  windowEnd: string
): RawEventRecord[] {
  return events
    .filter(e => e.date >= windowStart && e.date <= windowEnd)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Filter events by category.
 *
 * `available-anytime` events (online / always-on events) are always excluded
 * unless that slug is explicitly listed in `categories`. In practice the
 * config normalizer already strips it, so they are unconditionally excluded.
 * Passing an empty `categories` array means "include every non-available-anytime
 * event" (i.e. no per-category filter applied).
 */
export function filterByCategory(
  events: RawEventRecord[],
  categories: string[]
): RawEventRecord[] {
  const normalizedCategories = categories.map(c => c.toLowerCase().trim());

  return events
    .filter(e => {
      const slug = e.categorySlug.toLowerCase().trim();
      // Exclude always-available events unless the caller explicitly opted in.
      if (slug === 'available-anytime' && !normalizedCategories.includes('available-anytime')) {
        return false;
      }
      // Empty categories list → no per-category filter, include everything else.
      if (normalizedCategories.length === 0) return true;
      return normalizedCategories.includes(slug);
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
