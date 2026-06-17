import React from 'react';
import QRCode from 'react-qr-code';
import { useConcertsSnapshot } from './useConcertsSnapshot';
import { useConcertRotation } from './useConcertRotation';
import { useConcertsSkipEffect } from './useConcertsSkipEffect';
import type { ViewInternalSettings, ConcertsShowcaseSavedState } from '../../../app/internalSettings';
import styles from './Concerts.module.css';

interface ConcertsShowcaseViewProps {
  skipIfEmpty: boolean;
  internalSettings: ViewInternalSettings;
}

/**
 * Showcase layout for concerts-upcoming view.
 * Displays a single concert rotating through upcoming concerts.
 */
export function ConcertsShowcaseView({
  skipIfEmpty,
  internalSettings,
}: ConcertsShowcaseViewProps): React.ReactElement | null {
  const { snapshot, status } = useConcertsSnapshot();
  const { __onEmpty, __onStateChange, __savedState } = internalSettings;
  const concerts = snapshot?.concerts ?? [];
  const savedState = __savedState?.__view === 'concerts-upcoming'
    ? (__savedState as ConcertsShowcaseSavedState)
    : undefined;
  const activeIndex = useConcertRotation(concerts, 'concerts-upcoming', savedState, __onStateChange);

  useConcertsSkipEffect(status, skipIfEmpty, __onEmpty);

  if (status === 'loading' || status === 'error' || status === 'empty' || concerts.length === 0) {
    return (
      <div className={styles.showcaseContainer}>
        <div className={styles.showcaseFallback}>
          {status === 'empty' && <p className={styles.emptyMessage}>Keine Konzerte gefunden</p>}
          {status === 'error' && <p className={styles.errorMessage}>Fehler beim Laden der Konzerte</p>}
        </div>
      </div>
    );
  }

  const concert = concerts[activeIndex] ?? concerts[0];
  if (!concert) return <div className={styles.showcaseContainer} />;

  const qrUrl = concert.eventUrl || concert.lastFmUrl || `https://www.setlist.fm/search?query=${encodeURIComponent(concert.artistName)}`;

  return (
    <div className={styles.showcaseContainer} data-testid="concerts-upcoming-view">
      <div className={styles.showcaseFallback} />
      <div className={styles.showcaseOverlay}>
        <div className={styles.showcaseQr}>
          <QRCode
            value={qrUrl}
            size={256}
            bgColor="transparent"
            fgColor="#ffffff"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <div className={styles.showcaseInfo}>
          <span className={styles.showcaseCategoryBadge}>🎵 Concert</span>
          <div className={styles.showcaseTitle}>{concert.artistName}</div>
          {concert.venue && (
            <div className={styles.showcaseVenue}>
              <span className={styles.showcaseVenueIcon}>📍</span>
              {concert.venue}, {concert.city}
              {concert.distanceKm !== null && (
                <span className={styles.distance}> • {Math.round(concert.distanceKm)} km</span>
              )}
            </div>
          )}
          <div className={styles.showcaseDateTime}>
            {concert.dateDisplay}
          </div>
        </div>
      </div>
    </div>
  );
}
