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

export function filterByCategory(
  events: RawEventRecord[],
  categories: string[]
): RawEventRecord[] {
  const normalizedCategories = categories.map(c => c.toLowerCase().trim());
  const includeAvailableAnytime = normalizedCategories.includes('available-anytime');

  return events
    .filter(e => {
      const slug = e.categorySlug.toLowerCase().trim();
      if (slug === 'available-anytime' && !includeAvailableAnytime) return false;
      if (normalizedCategories.length === 0) return true;
      return normalizedCategories.includes(slug);
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
