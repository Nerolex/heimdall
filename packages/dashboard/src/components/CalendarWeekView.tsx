import React from 'react';
import type { CalendarSource, CalendarEvent } from '@heimdall/shared';
import { useCalendarEvents } from '../hooks/useCalendarEvents';

interface CalendarWeekViewProps {
  settings: Record<string, unknown>;
}

function getWeekDays(): Date[] {
  const today = new Date();
  const monday = new Date(today);
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isEventOnDay(event: CalendarEvent, day: Date): boolean {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return start <= dayEnd && end >= dayStart;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Week overview — compact grid showing events per day */
export function CalendarWeekView({ settings }: CalendarWeekViewProps): React.ReactElement {
  const sources = (settings.sources || []) as CalendarSource[];
  const { events, loading, error } = useCalendarEvents(sources, 7);

  const weekDays = getWeekDays();
  const today = new Date().toDateString();

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

  return (
    <div
      data-testid="calendar-week-view"
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #0f1419 0%, #1a2332 100%)',
        color: '#fff',
        paddingTop: 'calc(var(--overlay-height, 0px) + 2vw)',
        paddingLeft: '3vw',
        paddingRight: '3vw',
        paddingBottom: '3vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ fontSize: '3vw', fontWeight: 700, marginBottom: '2vw' }}>Diese Woche</div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.8vw' }}>
        {weekDays.map((day) => {
          const isToday = day.toDateString() === today;
          const dayEvents = events.filter((e) => isEventOnDay(e, day));

          return (
            <div
              key={day.toISOString()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: isToday ? 'rgba(74,144,217,0.15)' : 'rgba(255,255,255,0.03)',
                borderRadius: '0.5vw',
                padding: '0.8vw',
                border: isToday ? '1px solid rgba(74,144,217,0.4)' : '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}
            >
              {/* Day header */}
              <div style={{ textAlign: 'center', marginBottom: '0.5vw' }}>
                <div style={{ fontSize: '1.2vw', color: '#8899a6', fontWeight: 500 }}>
                  {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                </div>
                <div style={{
                  fontSize: '2vw',
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? '#4a90d9' : '#fff',
                }}>
                  {day.getDate()}
                </div>
              </div>

              {/* Events */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.3vw' }}>
                {dayEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    style={{
                      background: event.color,
                      opacity: 0.85,
                      borderRadius: '0.2vw',
                      padding: '0.2vw 0.4vw',
                      fontSize: '1vw',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {!event.allDay && (
                      <span style={{ opacity: 0.7, marginRight: '0.3vw' }}>{formatTime(event.start)}</span>
                    )}
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 5 && (
                  <div style={{ fontSize: '0.9vw', color: '#666', textAlign: 'center' }}>
                    +{dayEvents.length - 5} mehr
                  </div>
                )}
                {dayEvents.length === 0 && (
                  <div style={{ fontSize: '1vw', color: '#333', textAlign: 'center', marginTop: 'auto' }}>—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
