import React, { useEffect, useMemo } from 'react';
import { useEventsSnapshot } from './useEventsSnapshot';
import styles from './Events.module.css';

export function EventsWeekendView({ settings }: { settings: Record<string, unknown> }) {
  const { snapshot, status } = useEventsSnapshot('events-weekend');
  const skipIfEmpty = settings.skipIfEmpty === true;
  const onEmpty = settings.__onEmpty as (() => void) | undefined;

  const events = snapshot?.events ?? [];

  // All hooks must be called before any early returns
  const bgImage = useMemo(() => {
    const withImage = events.filter(e => e.imageUrl);
    if (!withImage.length) return undefined;
    return withImage[Math.floor(Math.random() * withImage.length)].imageUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.refreshedAt]);

  useEffect(() => {
    if (status === 'empty' && skipIfEmpty && onEmpty) onEmpty();
  }, [status, skipIfEmpty, onEmpty]);

  if (status === 'loading') return <div className={styles.emptyState}>Lade Events…</div>;
  if (status === 'error') return <div className={styles.errorState}>Events konnten nicht geladen werden</div>;
  if (status === 'empty') return <div className={styles.emptyState}>Keine Events am Wochenende</div>;

  // Group by date
  const groups = new Map<string, typeof events>();
  for (const event of events) {
    const existing = groups.get(event.date) ?? [];
    existing.push(event);
    groups.set(event.date, existing);
  }

  return (
    <div className={styles.groupedContainer}>
      {bgImage && (
        <div className={styles.groupedBg} style={{ backgroundImage: `url(${bgImage})` }} />
      )}
      <div className={styles.groupedBgOverlay} />
      <div className={styles.cardList}>
        {status === 'stale' && <div className={styles.staleBanner}>Zwischengespeicherte Daten</div>}
        {Array.from(groups.entries()).map(([, dayEvents]) => (
          <div key={dayEvents[0].date} className={styles.dayGroup}>
            <div className={styles.dayHeader}>{dayEvents[0].dateDisplay}</div>
            {dayEvents.map(event => (
              <div key={event.id} className={styles.eventRow}>
                <span className={styles.eventRowTime}>{event.startTime ? `${event.startTime} Uhr` : ''}</span>
                <div className={styles.eventRowBody}>
                  <span className={styles.eventRowTitle}>{event.title}</span>
                  {event.venue && <span className={styles.eventRowVenue}>📍 {event.venue}</span>}
                </div>
                <span className={styles.eventRowCat}>{event.categoryLabel}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}


