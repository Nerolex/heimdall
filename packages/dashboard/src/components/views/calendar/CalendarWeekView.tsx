import React from 'react';
import type { CalendarSource } from '@heimdall/shared';
import { useCalendarEvents } from '../../../hooks/useCalendarEvents';
import { getWeekDays, isEventOnDay, formatTime } from './calendarUtils';
import styles from './Calendar.module.css';

interface Props {
  settings: Record<string, unknown>;
}

export function CalendarWeekView({ settings }: Props): React.ReactElement {
  const sources = (settings.sources || []) as CalendarSource[];
  const { events, loading, error } = useCalendarEvents(sources, 7);

  const weekDays = getWeekDays();
  const today = new Date().toDateString();

  if (loading || error) {
    return <div className={styles.loading}>{error ? 'Calendar unavailable' : 'Loading calendar…'}</div>;
  }

  return (
    <div className={styles.container} data-testid="calendar-week-view">
      <div className={styles.weekTitle}>Diese Woche</div>

      <div className={styles.weekGrid}>
        {weekDays.map((day) => {
          const isToday = day.toDateString() === today;
          const dayEvents = events.filter((e) => isEventOnDay(e, day));

          return (
            <div key={day.toISOString()} className={isToday ? styles.weekDayToday : styles.weekDayNormal}>
              <div className={styles.weekDayHeader}>
                <div className={styles.weekDayName}>
                  {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                </div>
                <div className={`${styles.weekDayNumber} ${isToday ? styles.weekDayNumberToday : ''}`}>
                  {day.getDate()}
                </div>
              </div>

              <div className={styles.weekEventList}>
                {dayEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className={styles.weekEventPill} style={{ background: event.color }}>
                    {!event.allDay && <span className={styles.weekEventTime}>{formatTime(event.start)}</span>}
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 5 && (
                  <div className={styles.weekMoreLabel}>+{dayEvents.length - 5} mehr</div>
                )}
                {dayEvents.length === 0 && (
                  <div className={styles.weekEmptyLabel}>—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
