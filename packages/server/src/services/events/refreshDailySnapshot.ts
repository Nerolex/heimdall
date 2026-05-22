import type { EventsProviderConfig, EventRecord, EventsViewSnapshot } from '@heimdall/shared';
import { getTodayWindow, getWeekendWindow, getUpcomingWindow } from './dateWindows.js';
import { fetchCsrfCookie } from './rausgegangen.js';
import { paginateFetch } from './paginateFetch.js';
import { filterByWindow, filterByCategory } from './filterEvents.js';
import { getSnapshot, setSnapshot } from './snapshotStore.js';

function titleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d);
}

export async function refreshSnapshot(
  viewType: 'events-today' | 'events-weekend' | 'events-upcoming',
  config: EventsProviderConfig,
  days: number = 7
): Promise<void> {
  let windowStart: string;
  let windowEnd: string;
  if (viewType === 'events-today') {
    ({ windowStart, windowEnd } = getTodayWindow());
  } else if (viewType === 'events-weekend') {
    ({ windowStart, windowEnd } = getWeekendWindow());
  } else {
    ({ windowStart, windowEnd } = getUpcomingWindow(days));
  }

  try {
    const { cookie, csrfToken } = await fetchCsrfCookie(config.city);
    const raw = await paginateFetch(
      config.city,
      config.lat,
      config.lng,
      windowStart,
      windowEnd,
      cookie,
      csrfToken
    );
    const windowed = filterByWindow(raw, windowStart, windowEnd);
    const filtered = filterByCategory(windowed, config.categories ?? []);

    const events: EventRecord[] = filtered.map(r => {
      const parts = r.description.split(' | ');
      const venueAndTime = parts.length > 1 ? parts[1] : null;
      return {
        id: r.id,
        title: r.title,
        categorySlug: r.categorySlug,
        categoryLabel: titleCase(r.categorySlug),
        date: r.date,
        dateDisplay: formatDateDisplay(r.date),
        venueAndTime,
        rawDescription: r.description,
        recurrenceNote: r.additionalInfos,
        detailUrl: `https://rausgegangen.de/en/${config.city}/${r.slug}`,
      };
    });

    const snapshot: EventsViewSnapshot = {
      viewType,
      city: config.city,
      events,
      totalFetched: raw.length,
      windowStart,
      windowEnd,
      refreshedAt: new Date().toISOString(),
      stale: false,
    };
    setSnapshot(config.city, viewType, snapshot);
  } catch (err) {
    const prior = getSnapshot(config.city, viewType);
    if (prior) {
      setSnapshot(config.city, viewType, { ...prior, stale: true });
    } else {
      const errorSnapshot: EventsViewSnapshot = {
        viewType,
        city: config.city,
        events: [],
        totalFetched: 0,
        windowStart,
        windowEnd,
        refreshedAt: new Date().toISOString(),
        stale: true,
        error: (err as Error).message,
      };
      setSnapshot(config.city, viewType, errorSnapshot);
    }
  }
}

const ALLOWED_VIEW_TYPES = ['events-today', 'events-weekend', 'events-upcoming'] as const;
type AllowedViewType = (typeof ALLOWED_VIEW_TYPES)[number];

export function bootstrapRefreshScheduler(
  config: EventsProviderConfig,
  activeViewTypes: string[],
  days: number = 7
): void {
  const validTypes = activeViewTypes.filter((t): t is AllowedViewType =>
    ALLOWED_VIEW_TYPES.includes(t as AllowedViewType)
  );
  for (const viewType of validTypes) {
    void refreshSnapshot(viewType, config, days);
    setInterval(() => {
      void refreshSnapshot(viewType, config, days);
    }, 24 * 60 * 60 * 1000);
  }
}
