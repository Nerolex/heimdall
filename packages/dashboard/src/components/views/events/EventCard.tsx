import React from 'react';
import type { EventRecord } from '@heimdall/shared';
import styles from './Events.module.css';

interface EventCardProps {
  event: EventRecord;
}

export function EventCard({ event }: EventCardProps) {
  const venue = event.venueAndTime ?? event.rawDescription;
  return (
    <div className={styles.eventCard}>
      <div className={styles.cardHeader}>
        <span className={styles.categoryBadge}>{event.categoryLabel}</span>
        {event.cityDisplay && <span className={styles.cityBadge}>{event.cityDisplay}</span>}
        <span className={styles.dateDisplay}>{event.dateDisplay}</span>
      </div>
      <h3 className={styles.eventTitle}>{event.title}</h3>
      {venue && <p className={styles.venueAndTime}>{venue}</p>}
      {event.recurrenceNote && <p className={styles.recurrenceNote}>{event.recurrenceNote}</p>}
    </div>
  );
}
