import type { EventsProviderConfig, EventRecord, EventsViewSnapshot } from '@heimdall/shared';
import { getTodayWindow, getWeekendWindow, getUpcomingWindow } from './dateWindows.js';
import { fetchCsrfCookie, scrapeTimePage } from './rausgegangen.js';
import { filterByWindow, filterByCategory } from './filterEvents.js';
import { getSnapshot, setSnapshot } from './snapshotStore.js';

// Page slugs for each view type.
// NOTE: rausgegangen.de has no generic "upcoming N days" page. The weekend page is
// the nearest available source for events-upcoming; filterByWindow then restricts
// the results to the configured `days` window. Weekday-only events beyond the
// weekend may be absent from the upcoming snapshot.
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

  const cities = Array.isArray(config.cities) ? config.cities : [config.cities];
  const allEvents: EventRecord[] = [];
  let totalFetched = 0;
  let anyError: string | undefined;

  // Fetch each city in parallel
  await Promise.all(
    cities.map(async city => {
      try {
        const { cookie } = await fetchCsrfCookie(city);
        const pageSlug = PAGE_SLUG[viewType] ?? 'tipps-fuer-heute';
        const raw = await scrapeTimePage(city, cookie, pageSlug);
        const windowed = filterByWindow(raw, windowStart, windowEnd);
        const filtered = filterByCategory(windowed, config.categories ?? []);

        totalFetched += raw.length;

        const cityDisplay = city.charAt(0).toUpperCase() + city.slice(1);
        const events: EventRecord[] = filtered.map(r => {
          const parts = r.description.split(' | ');
          const venue = parts[0]?.trim() || null;
          const timeStr = parts[1]?.trim() || null;
          const startTime = timeStr?.match(/(\d{1,2}:\d{2})$/)?.[1] ?? null;
          return {
            id: `${city}-${r.id}`,
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
            city,
            cityDisplay,
          };
        });

        allEvents.push(...events);
      } catch (err) {
        anyError = anyError ?? (err as Error).message;
      }
    })
  );

  // Sort by date, then time
  allEvents.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startTime ?? '').localeCompare(b.startTime ?? '');
  });

  const citiesKey = cities.join('+');
  try {
    const snapshot: EventsViewSnapshot = {
      viewType,
      city: citiesKey,
      events: allEvents,
      totalFetched,
      windowStart,
      windowEnd,
      refreshedAt: new Date().toISOString(),
      stale: false,
    };
    setSnapshot(citiesKey, viewType, snapshot);
  } catch (err) {
    const prior = getSnapshot(citiesKey, viewType);
    if (prior) {
      setSnapshot(citiesKey, viewType, { ...prior, stale: true });
    } else {
      const errorSnapshot: EventsViewSnapshot = {
        viewType,
        city: citiesKey,
        events: [],
        totalFetched: 0,
        windowStart,
        windowEnd,
        refreshedAt: new Date().toISOString(),
        stale: true,
        error: anyError,
      };
      setSnapshot(citiesKey, viewType, errorSnapshot);
    }
  }
}

const ALLOWED_VIEW_TYPES = ['events-today', 'events-weekend', 'events-upcoming'] as const;
type AllowedViewType = (typeof ALLOWED_VIEW_TYPES)[number];

/**
 * Returns milliseconds until the next midnight in Europe/Berlin.
 * Used to schedule daily snapshot refreshes at the calendar day boundary.
 */
function msUntilNextMidnightBerlin(): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value);
  const minute = parseInt(parts.find(p => p.type === 'minute')!.value);
  const second = parseInt(parts.find(p => p.type === 'second')!.value);
  const msElapsedToday = (hour * 3600 + minute * 60 + second) * 1000;
  return 24 * 60 * 60 * 1000 - msElapsedToday;
}

export function bootstrapRefreshScheduler(
  config: EventsProviderConfig,
  activeViewTypes: string[],
  days: number = 7
): void {
  const validTypes = activeViewTypes.filter((t): t is AllowedViewType =>
    ALLOWED_VIEW_TYPES.includes(t as AllowedViewType)
  );
  for (const viewType of validTypes) {
    // Refresh immediately on startup, then at each Berlin midnight so the
    // "today" / "weekend" windows never serve the previous calendar day.
    void refreshSnapshot(viewType, config, days);
    const scheduleDaily = () => {
      void refreshSnapshot(viewType, config, days);
      setInterval(() => void refreshSnapshot(viewType, config, days), 24 * 60 * 60 * 1000);
    };
    setTimeout(scheduleDaily, msUntilNextMidnightBerlin());
  }
}
