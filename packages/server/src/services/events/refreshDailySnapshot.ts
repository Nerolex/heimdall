import type { EventsProviderConfig, EventRecord, EventsViewSnapshot } from '@heimdall/shared';
import { getTodayWindow, getWeekendWindow, getUpcomingWindow } from './dateWindows.js';
import { fetchCsrfCookie, scrapeTimePage } from './rausgegangen.js';
import { filterByWindow, filterByCategory } from './filterEvents.js';
import { getSnapshot, setSnapshot } from './snapshotStore.js';

// Page slugs for each view type
const PAGE_SLUG: Record<string, string> = {
  'events-today': 'tipps-fuer-heute',
  'events-weekend': 'tips-for-the-weekend',
  'events-upcoming': 'tips-for-the-weekend',
};

function titleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('de-DE', {
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
    const { cookie } = await fetchCsrfCookie(config.city);
    const pageSlug = PAGE_SLUG[viewType] ?? 'tipps-fuer-heute';
    const raw = await scrapeTimePage(config.city, cookie, pageSlug);
    const windowed = filterByWindow(raw, windowStart, windowEnd);
    const filtered = filterByCategory(windowed, config.categories ?? []);

    const events: EventRecord[] = filtered.map(r => {
      const parts = r.description.split(' | ');
      const venue = parts[0]?.trim() || null;
      const timeStr = parts[1]?.trim() || null;
      // Extract HH:MM from "DD.MM.YYYY HH:MM"
      const startTime = timeStr?.match(/(\d{1,2}:\d{2})$/)?.[1] ?? null;
      return {
        id: r.id,
        title: r.title,
        categorySlug: r.categorySlug,
        categoryLabel: r.categoryLabelRaw || titleCase(r.categorySlug),
        date: r.date,
        dateDisplay: formatDateDisplay(r.date),
        venue,
        startTime,
        venueAndTime: venue && startTime ? `${venue} · ${startTime} Uhr` : (venue ?? startTime),
        rawDescription: r.description,
        recurrenceNote: r.additionalInfos,
        detailUrl: `https://rausgegangen.de/events/${r.slug}/`,
        imageUrl: r.imageUrl,
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
