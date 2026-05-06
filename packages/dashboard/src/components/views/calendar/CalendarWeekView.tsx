import React from 'react';
import type { CalendarSource } from '@heimdall/shared';
import { useCalendarEvents } from '../../../hooks/useCalendarEvents';
import { getWeekDays, isEventOnDay, getHourPosition, formatTime } from './calendarUtils';
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

  if (loading || error) {
    return <div className={styles.loading}>{error ? 'Calendar unavailable' : 'Loading calendar…'}</div>;
  }

  // Separate all-day events from timed events
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

                {/* Events */}
                {dayEvents.map((event) => {
                  const startHour = Math.max(getHourPosition(event.start), START_HOUR);
                  const endHour = Math.min(getHourPosition(event.end), END_HOUR);
                  const top = ((startHour - START_HOUR) / TOTAL_HOURS) * 100;
                  const height = Math.max(((endHour - startHour) / TOTAL_HOURS) * 100, 3);

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
