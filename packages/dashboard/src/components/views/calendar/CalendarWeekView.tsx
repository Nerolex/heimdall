import React, { useState, useEffect } from 'react';
import type { CalendarSource } from '@heimdall/shared';
import { useCalendarEvents } from '../../../hooks/useCalendarEvents';
import { getWeekDays, isEventOnDay, clampEventToGrid } from './calendarUtils';
import styles from './Calendar.module.css';

interface Props {
  settings: Record<string, unknown>;
}

const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export function CalendarWeekView({ settings }: Props): React.ReactElement {
  const sources = (settings.sources || []) as CalendarSource[];
  const { events, loading, error } = useCalendarEvents(sources, 7);

  const weekDays = getWeekDays();
  const today = new Date().toDateString();
  const [nowPosition, setNowPosition] = useState(() => {
    const n = new Date();
    return ((n.getHours() + n.getMinutes() / 60) - START_HOUR) / TOTAL_HOURS * 100;
  });

  // Update now line every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date();
      setNowPosition(((n.getHours() + n.getMinutes() / 60) - START_HOUR) / TOTAL_HOURS * 100);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || error) {
    return <div className={styles.loading}>{error ? 'Calendar unavailable' : 'Loading calendar…'}</div>;
  }

  // Separate all-day events from timed events
  const allDayEvents = events.filter(e => e.allDay);
  const hasAllDay = weekDays.some(day => allDayEvents.some(e => isEventOnDay(e, day)));
  const timeLabels = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  return (
    <div className={styles.container} data-testid="calendar-week-view">
      <div className={styles.timetable}>
        {/* Header row: time gutter + day headers */}
        <div className={styles.ttHeader}>
          <div className={styles.ttGutterHeader} />
          {weekDays.map((day) => {
            const isToday = day.toDateString() === today;
            return (
              <div key={day.toISOString()} className={`${styles.ttDayHeader} ${isToday ? styles.ttDayHeaderToday : ''}`}>
                <span className={styles.ttDayName}>{day.toLocaleDateString('de-DE', { weekday: 'short' })}</span>
                <span className={`${styles.ttDayNum} ${isToday ? styles.ttDayNumToday : ''}`}>{day.getDate()}</span>
              </div>
            );
          })}
        </div>

        {/* All-day events strip — shown only when there are all-day events this week */}
        {hasAllDay && (
          <div style={{ display: 'flex', paddingBottom: '0.5vh', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: '6vw', flexShrink: 0 }} />
            {weekDays.map((day) => {
              const dayAllDayEvents = allDayEvents.filter(e => isEventOnDay(e, day));
              return (
                <div key={day.toISOString()} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2vh', padding: '0.3vh 0.2vw' }}>
                  {dayAllDayEvents.map(event => (
                    <div key={event.id} className={styles.allDayPill} style={{ background: event.color }}>
                      {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Body: time gutter + day columns with positioned events */}
        <div className={styles.ttBody}>
          {/* Time gutter */}
          <div className={styles.ttGutter}>
            {timeLabels.map((hour) => (
              <div key={hour} className={styles.ttGutterLabel} style={{ top: `${((hour - START_HOUR) / TOTAL_HOURS) * 100}%` }}>
                {`${hour}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const isToday = day.toDateString() === today;
            const dayEvents = events.filter((e) => isEventOnDay(e, day) && !e.allDay);

            return (
              <div key={day.toISOString()} className={`${styles.ttDayCol} ${isToday ? styles.ttDayColToday : ''}`}>
                {/* Hour grid lines */}
                {timeLabels.map((hour) => (
                  <div key={hour} className={styles.ttHourLine} style={{ top: `${((hour - START_HOUR) / TOTAL_HOURS) * 100}%` }} />
                ))}

                {/* Current time indicator */}
                {isToday && nowPosition >= 0 && nowPosition <= 100 && (
                  <div className={styles.ttNowLine} style={{ top: `${nowPosition}%` }} />
                )}

                {/* Events — start/end clamped to this day's boundaries for multi-day events */}
                {dayEvents.map((event) => {
                  const { clampedStart, clampedEnd } = clampEventToGrid(event, day, START_HOUR, END_HOUR);
                  const top = ((clampedStart - START_HOUR) / TOTAL_HOURS) * 100;
                  const height = Math.max(((clampedEnd - clampedStart) / TOTAL_HOURS) * 100, 3);

                  return (
                    <div
                      key={event.id}
                      className={styles.ttEvent}
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        background: event.color || 'rgba(74, 144, 217, 0.8)',
                      }}
                    >
                      <span className={styles.ttEventTitle}>{event.title}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
