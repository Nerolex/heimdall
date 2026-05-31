import React, { useMemo, useRef } from 'react';
import { useEventsSnapshot } from './useEventsSnapshot';
import { useEventsSkipEffect } from './useEventsSkipEffect';
import type { ViewInternalSettings, EventsWeekendSavedState, ViewSavedState } from '../../../app/internalSettings';
import styles from './Events.module.css';

export function EventsWeekendView({ settings }: { settings: Record<string, unknown> }) {
  const { snapshot, status } = useEventsSnapshot('events-weekend');
  const skipIfEmpty = settings.skipIfEmpty !== false;
  const { __onEmpty, __onStateChange, __savedState } = settings as ViewInternalSettings;

  const events = snapshot?.events ?? [];

  const savedStateRef = useRef(
    __savedState?.__view === 'events-weekend' ? (__savedState as EventsWeekendSavedState) : undefined
  );
  const onStateChangeRef = useRef(__onStateChange as ((s: ViewSavedState) => void) | undefined);

  // All hooks must be called before any early returns
  const bgImage = useMemo(() => {
    if (savedStateRef.current != null) return savedStateRef.current.bgImageUrl;
    const withImage = events.filter(e => e.imageUrl);
    const picked = withImage.length
      ? withImage[Math.floor(Math.random() * withImage.length)].imageUrl
      : undefined;
    // Save on first pick so back navigation restores the same image
    if (picked !== undefined) {
      onStateChangeRef.current?.({ __view: 'events-weekend', bgImageUrl: picked });
    }
    return picked;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.refreshedAt]);

  useEventsSkipEffect(status, skipIfEmpty, __onEmpty);

  if (status === 'loading') return <div className={styles.groupedContainer} />;
  if (status === 'error' || status === 'empty' || events.length === 0) {
    return skipIfEmpty ? null : <div className={styles.groupedContainer} />;
  }

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

