import React, { useRef } from 'react';
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
  const onEmptyRef = useRef((settings.__onEmpty as (() => void) | undefined));
  const { events, loading, error } = useCalendarEvents(sources, daysAhead);

  if (loading || error) {
    return <div className={styles.loading}>{error ? 'Calendar unavailable' : 'Loading calendar…'}</div>;
  }

  const grouped = groupByDay(events);
  const maxItems = window.innerHeight > 800 ? 8 : window.innerHeight > 500 ? 6 : 4;
  const todayStr = new Date().toDateString();

  if (events.length === 0) {
    onEmptyRef.current?.();
  }

  // Calculate days from today for proximity scaling
  function daysFromToday(dateStr: string): number {
    const d = new Date(dateStr);
    const diff = Math.floor((d.getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  // Scale: 0 days = 1.0, 1 day = 0.85, 2 = 0.72, 3+ progressively smaller
  function getScale(daysAway: number): number {
    if (daysAway <= 0) return 1.0;
    return Math.max(0.6, 1.0 - daysAway * 0.12);
  }

  function getOpacity(daysAway: number): number {
    if (daysAway <= 0) return 1.0;
    return Math.max(0.5, 1.0 - daysAway * 0.1);
  }

  return (
    <div className={styles.agendaContainer} data-testid="calendar-agenda-view">
      <div className={styles.agendaTitle}>Nächste Termine</div>
      <div className={styles.agendaContent}>
        {events.length === 0 && (
          <div className={styles.agendaEmpty}>Keine Termine in den nächsten {daysAhead} Tagen</div>
        )}
        {(() => {
          let count = 0;
          return Array.from(grouped.entries()).map(([day, dayEvents]) => {
            if (count >= maxItems) return null;
            const remaining = maxItems - count;
            const visibleEvents = dayEvents.slice(0, remaining);
            count += visibleEvents.length;

            const daysAway = daysFromToday(dayEvents[0].start);
            const scale = getScale(daysAway);
            const opacity = getOpacity(daysAway);

            return (
              <div
                key={day}
                className={styles.dayGroup}
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                  transformOrigin: 'left center',
                  marginBottom: `${1.5 * scale}vw`,
                }}
              >
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
