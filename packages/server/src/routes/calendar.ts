import type { FastifyInstance } from 'fastify';
import type { CalendarSource, CalendarEvent } from '@heimdall/shared';
import ICAL from 'ical.js';

const DEFAULT_COLOR = '#4a90d9';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  events: CalendarEvent[];
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

async function fetchIcal(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parseIcal(icsData: string, source: CalendarSource): CalendarEvent[] {
  const jcal = ICAL.parse(icsData);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents('vevent');
  const events: CalendarEvent[] = [];
  const now = new Date();
  const futureLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);

    // Handle recurring events
    if (event.isRecurring()) {
      const iterator = event.iterator();
      let next = iterator.next();
      let count = 0;
      while (next && count < 100) {
        const occurrence = event.getOccurrenceDetails(next);
        const start = occurrence.startDate.toJSDate();
        const end = occurrence.endDate.toJSDate();
        if (start > futureLimit) break;
        if (end >= now) {
          events.push(makeEvent(event, start, end, source));
        }
        next = iterator.next();
        count++;
      }
    } else {
      const start = event.startDate.toJSDate();
      const end = event.endDate.toJSDate();
      if (end >= now && start <= futureLimit) {
        events.push(makeEvent(event, start, end, source));
      }
    }
  }

  return events;
}

function makeEvent(event: ICAL.Event, start: Date, end: Date, source: CalendarSource): CalendarEvent {
  const allDay = event.startDate.isDate;
  return {
    id: `${source.name}-${event.uid}-${start.toISOString()}`,
    title: event.summary || '(No title)',
    start: start.toISOString(),
    end: end.toISOString(),
    allDay,
    calendar: source.name,
    color: source.color || DEFAULT_COLOR,
    location: event.location || undefined,
  };
}

async function getEventsForSources(sources: CalendarSource[]): Promise<CalendarEvent[]> {
  const allEvents: CalendarEvent[] = [];

  for (const source of sources) {
    const cached = cache.get(source.url);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      allEvents.push(...cached.events);
      continue;
    }

    try {
      const icsData = await fetchIcal(source.url);
      const events = parseIcal(icsData, source);
      cache.set(source.url, { events, fetchedAt: Date.now() });
      allEvents.push(...events);
    } catch (err) {
      // If we have stale cache, use it
      if (cached) {
        allEvents.push(...cached.events);
      }
      console.error(`Failed to fetch calendar "${source.name}":`, (err as Error).message);
    }
  }

  // Sort by start time
  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return allEvents;
}

export async function calendarRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: { sources: CalendarSource[]; daysAhead?: number } }>(
    '/api/calendar',
    async (request, reply) => {
      const { sources, daysAhead } = request.body || {};

      if (!sources || !Array.isArray(sources) || sources.length === 0) {
        return reply.status(400).send({ error: 'sources array required' });
      }

      try {
        let events = await getEventsForSources(sources);

        // Filter to daysAhead if specified
        if (daysAhead && daysAhead > 0) {
          const limit = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
          events = events.filter((e) => new Date(e.start) <= limit);
        }

        return reply.status(200).send({ events });
      } catch (err) {
        return reply.status(500).send({ error: (err as Error).message });
      }
    }
  );
}
