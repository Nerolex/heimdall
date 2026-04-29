import { useEffect, useState } from 'react';
import type { CalendarEvent, CalendarSource } from '@heimdall/shared';

/** Hook to fetch calendar events from the server */
export function useCalendarEvents(sources: CalendarSource[], daysAhead: number): {
  events: CalendarEvent[];
  loading: boolean;
  error: boolean;
} {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!sources || sources.length === 0) {
      setLoading(false);
      return;
    }

    function fetchEvents(): void {
      fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources, daysAhead }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setEvents(data.events || []);
          setError(false);
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    }

    fetchEvents();
    const timer = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [JSON.stringify(sources), daysAhead]);

  return { events, loading, error };
}
