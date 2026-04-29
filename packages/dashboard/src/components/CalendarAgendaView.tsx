import React from 'react';
import type { CalendarSource, CalendarEvent } from '@heimdall/shared';
import { useCalendarEvents } from '../hooks/useCalendarEvents';

interface CalendarAgendaViewProps {
  settings: Record<string, unknown>;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Heute';
  if (d.toDateString() === tomorrow.toDateString()) return 'Morgen';
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' });
}

function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const day = new Date(event.start).toDateString();
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(event);
  }
  return groups;
}

/** Agenda view — vertical list of upcoming events grouped by day */
export function CalendarAgendaView({ settings }: CalendarAgendaViewProps): React.ReactElement {
  const sources = (settings.sources || []) as CalendarSource[];
  const daysAhead = (settings.daysAhead as number) || 7;
  const { events, loading, error } = useCalendarEvents(sources, daysAhead);

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#111' }}>
        Loading calendar…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#111' }}>
        Calendar unavailable
      </div>
    );
  }

  const grouped = groupByDay(events);

  return (
    <div
      data-testid="calendar-agenda-view"
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #0f1419 0%, #1a2332 100%)',
        color: '#fff',
        paddingTop: 'calc(var(--overlay-height, 0px) + 2vw)',
        paddingLeft: '4vw',
        paddingRight: '4vw',
        paddingBottom: '4vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ fontSize: '3vw', fontWeight: 700, marginBottom: '2vw' }}>Termine</div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {events.length === 0 && (
          <div style={{ color: '#666', fontSize: '2vw' }}>Keine Termine in den nächsten {daysAhead} Tagen</div>
        )}
        {Array.from(grouped.entries()).map(([day, dayEvents]) => (
          <div key={day} style={{ marginBottom: '2vw' }}>
            <div style={{ fontSize: '1.8vw', fontWeight: 600, color: '#8899a6', marginBottom: '0.5vw' }}>
              {formatDate(dayEvents[0].start)}
            </div>
            {dayEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1vw',
                  padding: '0.6vw 0',
                  borderLeft: `0.3vw solid ${event.color}`,
                  paddingLeft: '1vw',
                  marginBottom: '0.4vw',
                }}
              >
                <span style={{ fontSize: '1.5vw', color: '#8899a6', minWidth: '6vw' }}>
                  {event.allDay ? 'Ganztägig' : formatTime(event.start)}
                </span>
                <span style={{ fontSize: '1.8vw', fontWeight: 500 }}>{event.title}</span>
                {event.location && (
                  <span style={{ fontSize: '1.3vw', color: '#666', marginLeft: 'auto' }}>{event.location}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
