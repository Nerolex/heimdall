import React from 'react';
import type { CalendarSource } from '@heimdall/shared';
import { useCalendarEvents } from '../../../hooks/useCalendarEvents';
import { formatDate, formatTime, groupByDay } from './calendarUtils';
import styles from './Calendar.module.css';

interface Props {
  settings: Record<string, unknown>;
}

export function CalendarAgendaView({ settings }: Props): React.ReactElement {
  const sources = (settings.sources || []) as CalendarSource[];
  const daysAhead = (settings.daysAhead as number) || 7;
  const { events, loading, error } = useCalendarEvents(sources, daysAhead);

  if (loading || error) {
    return <div className={styles.loading}>{error ? 'Calendar unavailable' : 'Loading calendar…'}</div>;
  }

  const grouped = groupByDay(events);

  return (
    <div className={styles.agendaContainer} data-testid="calendar-agenda-view">
      <div className={styles.agendaTitle}>Termine</div>
      <div className={styles.agendaContent}>
        {events.length === 0 && (
          <div className={styles.agendaEmpty}>Keine Termine in den nächsten {daysAhead} Tagen</div>
        )}
        {(() => {
          let count = 0;
          const maxItems = 4;
          return Array.from(grouped.entries()).map(([day, dayEvents]) => {
            if (count >= maxItems) return null;
            const remaining = maxItems - count;
            const visibleEvents = dayEvents.slice(0, remaining);
            count += visibleEvents.length;
            return (
              <div key={day} className={styles.dayGroup}>
                <div className={styles.dayLabel}>{formatDate(dayEvents[0].start)}</div>
                {visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    className={styles.eventRow}
                    style={{ '--event-color': event.color } as React.CSSProperties}
                  >
                    <span className={styles.eventTime}>
                      {event.allDay ? 'Ganztägig' : formatTime(event.start)}
                    </span>
                    <span className={styles.eventTitle}>{event.title}</span>
                  </div>
                ))}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
