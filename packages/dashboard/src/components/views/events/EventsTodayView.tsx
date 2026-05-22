import React, { useEffect } from 'react';
import { useEventsSnapshot } from './useEventsSnapshot';
import { EventCard } from './EventCard';
import styles from './Events.module.css';

export function EventsTodayView({ settings }: { settings: Record<string, unknown> }) {
  const { snapshot, status } = useEventsSnapshot('events-today');
  const skipIfEmpty = settings.skipIfEmpty === true;
  const onEmpty = settings.__onEmpty as (() => void) | undefined;

  useEffect(() => {
    if (status === 'empty' && skipIfEmpty && onEmpty) {
      onEmpty();
    }
  }, [status, skipIfEmpty, onEmpty]);

  if (status === 'loading') {
    return <div className={styles.emptyState}>Loading events…</div>;
  }
  if (status === 'error') {
    return <p className={styles.errorState}>Could not load events</p>;
  }
  if (status === 'empty') {
    return <p className={styles.emptyState}>No events today</p>;
  }

  return (
    <div className={styles.cardList}>
      {status === 'stale' && <div className={styles.staleBanner}>Showing cached data</div>}
      {snapshot?.events.map(event => <EventCard key={event.id} event={event} />)}
    </div>
  );
}
