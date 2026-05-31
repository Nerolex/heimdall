import React from 'react';
import QRCode from 'react-qr-code';
import { useEventsSnapshot } from './useEventsSnapshot';
import { useEventRotation } from './useEventRotation';
import { useEventsSkipEffect } from './useEventsSkipEffect';
import type { ViewInternalSettings, EventsShowcaseSavedState } from '../../../app/internalSettings';
import styles from './Events.module.css';

interface EventsShowcaseViewProps {
  viewType: 'events-today' | 'events-upcoming';
  days?: number;
  skipIfEmpty: boolean;
  internalSettings: ViewInternalSettings;
}

/**
 * Shared showcase layout for events-today and events-upcoming views.
 * Displays a single event with a full-bleed image, QR code, and detail overlay.
 */
export function EventsShowcaseView({
  viewType,
  days,
  skipIfEmpty,
  internalSettings,
}: EventsShowcaseViewProps): React.ReactElement | null {
  const { snapshot, status } = useEventsSnapshot(viewType, days);
  const { __onEmpty, __onStateChange, __savedState } = internalSettings;
  const events = snapshot?.events ?? [];
  const savedState = __savedState?.__view === viewType
    ? (__savedState as EventsShowcaseSavedState)
    : undefined;
  const activeIndex = useEventRotation(events, viewType, savedState, __onStateChange);

  useEventsSkipEffect(status, skipIfEmpty, __onEmpty);

  if (status === 'loading') return <div className={styles.showcaseContainer} />;
  if (status === 'error' || status === 'empty' || events.length === 0) {
    // skipIfEmpty=true → __onEmpty() was called; return null so the cycle advances
    // skipIfEmpty=false → stay visible with an empty container rather than a blank screen
    return skipIfEmpty ? null : <div className={styles.showcaseContainer} />;
  }

  const event = events[activeIndex] ?? events[0];
  if (!event) return <div className={styles.showcaseContainer} />;

  return (
    <div className={styles.showcaseContainer} data-testid={`${viewType}-view`}>
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
