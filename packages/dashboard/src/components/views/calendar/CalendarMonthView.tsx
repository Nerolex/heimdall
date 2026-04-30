import React from 'react';
import type { CalendarSource } from '@heimdall/shared';
import { useCalendarEvents } from '../../../hooks/useCalendarEvents';
import { getMonthGrid, getEventsForDay } from './calendarUtils';
import styles from './Calendar.module.css';

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface Props {
  settings: Record<string, unknown>;
}

export function CalendarMonthView({ settings }: Props): React.ReactElement {
  const sources = (settings.sources || []) as CalendarSource[];
  const { events, loading, error } = useCalendarEvents(sources, 31);

  const now = new Date();
  const weeks = getMonthGrid(now.getFullYear(), now.getMonth());
  const todayStr = now.toDateString();
  const monthName = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  if (loading || error) {
    return <div className={styles.loading}>{error ? 'Calendar unavailable' : 'Loading calendar…'}</div>;
  }

  return (
    <div className={styles.container} data-testid="calendar-month-view">
      <div className={styles.monthTitle}>{monthName}</div>

      <div className={styles.weekdayHeaders}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={styles.weekdayLabel}>{label}</div>
        ))}
      </div>

      <div className={styles.monthGrid} style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className={styles.weekRow}>
            {week.map((date, di) => {
              if (!date) return <div key={di} className={styles.dayCellEmpty} />;

              const isToday = date.toDateString() === todayStr;
              const dayEvents = getEventsForDay(events, date);
              const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());

              return (
                <div
                  key={di}
                  className={isToday ? styles.dayCellToday : styles.dayCellNormal}
                  style={{ opacity: isPast ? 0.5 : 1 }}
                >
                  <div className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : ''}`}>
                    {date.getDate()}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className={styles.eventDots}>
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={styles.eventDot}
                          style={{ background: event.color }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
