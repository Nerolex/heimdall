import React from 'react';
import type { CalendarSource } from '@heimdall/shared';
import { useCalendarEvents } from '../../../hooks/useCalendarEvents';
import { getHourPosition } from './calendarUtils';
import styles from './Calendar.module.css';

interface Props {
  settings: Record<string, unknown>;
}

const START_HOUR = 6;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function CalendarDayView({ settings }: Props): React.ReactElement {
  const sources = (settings.sources || []) as CalendarSource[];
  const { events, loading, error } = useCalendarEvents(sources, 1);

  const today = new Date();
  const todayStr = today.toDateString();
  const todayEvents = events.filter((e) => new Date(e.start).toDateString() === todayStr && !e.allDay);
  const allDayEvents = events.filter((e) => new Date(e.start).toDateString() === todayStr && e.allDay);

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);
  const currentHour = today.getHours() + today.getMinutes() / 60;
  const currentPosition = ((currentHour - START_HOUR) / TOTAL_HOURS) * 100;

  if (loading || error) {
    return <div className={styles.loading}>{error ? 'Calendar unavailable' : 'Loading calendar…'}</div>;
  }

  return (
    <div className={styles.container} data-testid="calendar-day-view">
      <div className={styles.dayViewTitle}>
        {today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>

      {allDayEvents.length > 0 && (
        <div className={styles.allDayRow}>
          {allDayEvents.map((event) => (
            <div key={event.id} className={styles.allDayPill} style={{ background: event.color }}>
              {event.title}
            </div>
          ))}
        </div>
      )}

      <div className={styles.timeline}>
        {hours.map((hour) => (
          <div key={hour} className={styles.hourLine} style={{ top: `${((hour - START_HOUR) / TOTAL_HOURS) * 100}%` }}>
            <span className={styles.hourLabel}>{formatHour(hour)}</span>
          </div>
        ))}

        {currentHour >= START_HOUR && currentHour <= END_HOUR && (
          <div className={styles.nowLine} style={{ top: `${currentPosition}%` }}>
            <div className={styles.nowDot} />
          </div>
        )}

        {todayEvents.map((event) => {
          const eventStart = getHourPosition(event.start);
          const eventEnd = getHourPosition(event.end);
          const top = ((Math.max(eventStart, START_HOUR) - START_HOUR) / TOTAL_HOURS) * 100;
          const bottom = ((Math.min(eventEnd, END_HOUR) - START_HOUR) / TOTAL_HOURS) * 100;
          const height = Math.max(bottom - top, 2);

          return (
            <div
              key={event.id}
              className={styles.timelineEvent}
              style={{ top: `${top}%`, height: `${height}%`, background: event.color }}
            >
              {event.title}
              {event.location && <span className={styles.timelineEventLocation}>· {event.location}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
