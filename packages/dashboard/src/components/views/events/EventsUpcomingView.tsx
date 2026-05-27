import React, { useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { useEventsSnapshot } from './useEventsSnapshot';
import styles from './Events.module.css';

// Persist the last-shown index across view mounts (advances each display)
let lastShownIndex = 0;

export function EventsUpcomingView({ settings }: { settings: Record<string, unknown> }) {
  const days = typeof settings.days === 'number' ? settings.days : 7;
  const { snapshot, status } = useEventsSnapshot('events-upcoming', days);
  const skipIfEmpty = settings.skipIfEmpty !== false;
  const onEmpty = settings.__onEmpty as (() => void) | undefined;
  const indexRef = useRef<number | null>(null);

  const savedStateRef = useRef(settings.__savedState as { activeIndex: number } | undefined);
  const onStateChangeRef = useRef(settings.__onStateChange as ((s: unknown) => void) | undefined);

  const events = snapshot?.events ?? [];

  // Assign index on first render of this mount
  if (indexRef.current === null && events.length > 0) {
    if (savedStateRef.current != null) {
      // Restore the exact event that was shown before — don't advance the counter
      indexRef.current = savedStateRef.current.activeIndex % events.length;
    } else {
      indexRef.current = lastShownIndex % events.length;
      lastShownIndex = (lastShownIndex + 1) % events.length;
      onStateChangeRef.current?.({ activeIndex: indexRef.current });
    }
  }

  useEffect(() => {
    if ((status === 'empty' || status === 'error') && skipIfEmpty && onEmpty) {
      onEmpty();
    }
  }, [status, skipIfEmpty, onEmpty]);

  if (status === 'loading') return <div className={styles.showcaseContainer} />;
  if (events.length === 0) return null;

  const event = events[indexRef.current ?? 0] ?? events[0];
  if (!event) return <div className={styles.showcaseContainer} />;

  return (
    <div className={styles.showcaseContainer} data-testid="events-upcoming-view">
      <div
        className={styles.showcaseImage}
        style={event.imageUrl ? { backgroundImage: `url(${event.imageUrl})` } : undefined}
      />
      {!event.imageUrl && <div className={styles.showcaseFallback} />}
      <div className={styles.showcaseOverlay}>
        <div className={styles.showcaseQr}>
          <QRCode
            value={event.detailUrl}
            size={256}
            bgColor="transparent"
            fgColor="#ffffff"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <div className={styles.showcaseInfo}>
          {event.categoryLabel && (
            <span className={styles.showcaseCategoryBadge}>{event.categoryLabel}</span>
          )}
          <div className={styles.showcaseTitle}>{event.title}</div>
          {event.venue && (
            <div className={styles.showcaseVenue}>
              <span className={styles.showcaseVenueIcon}>📍</span>{event.venue}
            </div>
          )}
          <div className={styles.showcaseDateTime}>
            {event.dateDisplay}{event.startTime ? ` · ${event.startTime} Uhr` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}


