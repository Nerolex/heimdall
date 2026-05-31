import React, { useEffect, useMemo, useRef } from 'react';
import type { CalendarSource } from '@heimdall/shared';
import { useCalendarEvents } from '../../../hooks/useCalendarEvents';
import { getEventsForDay, clampEventToGrid } from './calendarUtils';
import { getRandomQuote } from './emptyDayQuotes';
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
  const onEmptyRef = useRef((settings.__onEmpty as (() => void) | undefined));
  const { events, loading, error } = useCalendarEvents(sources, 1);
  const quote = useMemo(() => getRandomQuote(), []);

  const today = new Date();
  // getEventsForDay uses overlap logic (start <= dayEnd && end >= dayStart),
  // so multi-day and overnight events that span into today are included.
  const dayEvents = getEventsForDay(events, today);
  const todayEvents = dayEvents.filter(e => !e.allDay);
  const allDayEvents = dayEvents.filter(e => e.allDay);
  const isEmpty = todayEvents.length === 0 && allDayEvents.length === 0;

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);
  const currentHour = today.getHours() + today.getMinutes() / 60;
  const currentPosition = ((currentHour - START_HOUR) / TOTAL_HOURS) * 100;

  // Notify parent after render, not during — avoids React render-phase state updates.
  useEffect(() => {
    if (isEmpty && !loading && !error) {
      onEmptyRef.current?.();
    }
  }, [isEmpty, loading, error]);

  if (loading || error) {
    return <div className={styles.loading}>{error ? 'Calendar unavailable' : 'Loading calendar…'}</div>;
  }

  return (
    <div className={styles.container} data-testid="calendar-day-view">
      {isEmpty ? (
        <div className={styles.dayEmptyContainer}>
          <div className={styles.dayEmptyDate}>
            {today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className={styles.dayEmptyQuote}>„{quote}"</div>
        </div>
      ) : (
        <>
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
          // Clamp start/end to the current day's grid to correctly render
          // multi-day and overnight events that only partially overlap today.
          const { clampedStart, clampedEnd } = clampEventToGrid(event, today, START_HOUR, END_HOUR);
          const top = ((clampedStart - START_HOUR) / TOTAL_HOURS) * 100;
          const height = Math.max(((clampedEnd - clampedStart) / TOTAL_HOURS) * 100, 2);

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
        </>
      )}
    </div>
  );
}
