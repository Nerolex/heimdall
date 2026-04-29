import React from 'react';
import type { CalendarSource, CalendarEvent } from '@heimdall/shared';
import { useCalendarEvents } from '../hooks/useCalendarEvents';

interface CalendarMonthViewProps {
  settings: Record<string, unknown>;
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  // Monday = 0, Sunday = 6
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = new Array(startWeekday).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(new Date(year, month, day));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return weeks;
}

function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return events.filter((e) => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    return start <= dayEnd && end >= dayStart;
  });
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Month calendar grid with current date highlighted and event indicators */
export function CalendarMonthView({ settings }: CalendarMonthViewProps): React.ReactElement {
  const sources = (settings.sources || []) as CalendarSource[];
  const { events, loading, error } = useCalendarEvents(sources, 31);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayStr = now.toDateString();
  const weeks = getMonthGrid(year, month);

  const monthName = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

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
      data-testid="calendar-month-view"
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #0f1419 0%, #1a2332 100%)',
        color: '#fff',
        paddingTop: 'calc(var(--overlay-height, 0px) + 2vw)',
        paddingLeft: '3vw',
        paddingRight: '3vw',
        paddingBottom: '2vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Month title */}
      <div style={{ fontSize: '3vw', fontWeight: 700, marginBottom: '1.5vw', textTransform: 'capitalize' }}>
        {monthName}
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4vw', marginBottom: '0.5vw' }}>
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            style={{
              textAlign: 'center',
              fontSize: '1.3vw',
              fontWeight: 600,
              color: '#8899a6',
              padding: '0.3vw 0',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateRows: `repeat(${weeks.length}, 1fr)`, gap: '0.4vw' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4vw' }}>
            {week.map((date, di) => {
              if (!date) {
                return <div key={di} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '0.3vw' }} />;
              }

              const isToday = date.toDateString() === todayStr;
              const dayEvents = getEventsForDay(events, date);
              const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());

              return (
                <div
                  key={di}
                  style={{
                    background: isToday ? 'rgba(74,144,217,0.2)' : 'rgba(255,255,255,0.03)',
                    border: isToday ? '2px solid rgba(74,144,217,0.6)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '0.4vw',
                    padding: '0.4vw',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    opacity: isPast ? 0.5 : 1,
                  }}
                >
                  {/* Day number */}
                  <div style={{
                    fontSize: '1.6vw',
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? '#4a90d9' : '#fff',
                    textAlign: 'center',
                    marginBottom: '0.2vw',
                  }}>
                    {date.getDate()}
                  </div>

                  {/* Event dots / pills */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15vw', overflow: 'hidden' }}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        style={{
                          background: event.color,
                          borderRadius: '0.15vw',
                          padding: '0.1vw 0.3vw',
                          fontSize: '0.8vw',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          opacity: 0.85,
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '0.7vw', color: '#666', textAlign: 'center' }}>
                        +{dayEvents.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
