import React from 'react';
import type { CalendarSource, CalendarEvent } from '@heimdall/shared';
import { useCalendarEvents } from '../hooks/useCalendarEvents';

interface CalendarDayViewProps {
  settings: Record<string, unknown>;
}

function getHourPosition(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/** Day view — timeline for today with colored event blocks */
export function CalendarDayView({ settings }: CalendarDayViewProps): React.ReactElement {
  const sources = (settings.sources || []) as CalendarSource[];
  const { events, loading, error } = useCalendarEvents(sources, 1);

  const today = new Date();
  const todayStr = today.toDateString();
  const todayEvents = events.filter((e) => {
    const start = new Date(e.start);
    return start.toDateString() === todayStr && !e.allDay;
  });
  const allDayEvents = events.filter((e) => {
    const start = new Date(e.start);
    return start.toDateString() === todayStr && e.allDay;
  });

  // Show hours from 6:00 to 23:00
  const startHour = 6;
  const endHour = 23;
  const totalHours = endHour - startHour;
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  // Current time indicator
  const currentHour = today.getHours() + today.getMinutes() / 60;
  const currentPosition = ((currentHour - startHour) / totalHours) * 100;

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
      data-testid="calendar-day-view"
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
      <div style={{ fontSize: '3vw', fontWeight: 700, marginBottom: '1vw' }}>
        {today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5vw', marginBottom: '1vw', flexWrap: 'wrap' }}>
          {allDayEvents.map((event) => (
            <div
              key={event.id}
              style={{
                background: event.color,
                borderRadius: '0.3vw',
                padding: '0.3vw 0.8vw',
                fontSize: '1.3vw',
                fontWeight: 500,
                opacity: 0.9,
              }}
            >
              {event.title}
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Hour lines */}
        {hours.map((hour) => {
          const top = ((hour - startHour) / totalHours) * 100;
          return (
            <div
              key={hour}
              style={{
                position: 'absolute',
                top: `${top}%`,
                left: '5vw',
                right: 0,
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{
                position: 'absolute',
                left: '-5vw',
                top: '-0.8vw',
                fontSize: '1.2vw',
                color: '#556',
                width: '4.5vw',
                textAlign: 'right',
              }}>
                {formatHour(hour)}
              </span>
            </div>
          );
        })}

        {/* Current time indicator */}
        {currentHour >= startHour && currentHour <= endHour && (
          <div
            style={{
              position: 'absolute',
              top: `${currentPosition}%`,
              left: '5vw',
              right: 0,
              height: '2px',
              background: '#e74c3c',
              zIndex: 5,
            }}
          >
            <div style={{
              position: 'absolute',
              left: '-0.5vw',
              top: '-0.4vw',
              width: '0.8vw',
              height: '0.8vw',
              borderRadius: '50%',
              background: '#e74c3c',
            }} />
          </div>
        )}

        {/* Events */}
        {todayEvents.map((event) => {
          const eventStart = getHourPosition(event.start);
          const eventEnd = getHourPosition(event.end);
          const top = ((Math.max(eventStart, startHour) - startHour) / totalHours) * 100;
          const bottom = ((Math.min(eventEnd, endHour) - startHour) / totalHours) * 100;
          const height = bottom - top;

          return (
            <div
              key={event.id}
              style={{
                position: 'absolute',
                top: `${top}%`,
                height: `${Math.max(height, 2)}%`,
                left: '6vw',
                right: '1vw',
                background: event.color,
                opacity: 0.85,
                borderRadius: '0.3vw',
                padding: '0.3vw 0.6vw',
                overflow: 'hidden',
                fontSize: '1.3vw',
                fontWeight: 500,
              }}
            >
              {event.title}
              {event.location && (
                <span style={{ marginLeft: '0.5vw', opacity: 0.7, fontSize: '1.1vw' }}>
                  · {event.location}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
