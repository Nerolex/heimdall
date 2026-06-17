import React from 'react';
import { createPortal } from 'react-dom';
import styles from './Plex.module.css';
import type { NavEntry, PlexSession } from './plexTypes';

interface PlexNavOverlayProps {
  navStack: NavEntry[];
  navClosing: boolean;
  navLoading: boolean;
  activeTrackRatingKey?: string;
  onBack: () => void;
  onArtistSelect: (artist: PlexSession) => void;
  onAlbumSelect: (album: PlexSession) => void;
  onTrackSelect: (track: PlexSession, allTracks: PlexSession[]) => void;
}

export function PlexNavOverlay({
  navStack,
  navClosing,
  navLoading,
  activeTrackRatingKey,
  onBack,
  onArtistSelect,
  onAlbumSelect,
  onTrackSelect,
}: PlexNavOverlayProps): React.ReactElement | null {
  if (navStack.length === 0 && !navClosing) return null;

  const current = navStack[navStack.length - 1];
  const items = current?.items || [];

  return createPortal(
    <div className={`${styles.navOverlay} ${navClosing ? styles.navOverlayClosing : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className={styles.navHeader} onClick={onBack}>
        <button className={styles.backBtn}>←</button>
        <span className={styles.navLabel}>{current?.label}</span>
      </div>
      <div className={styles.navList}>
        {navLoading ? (
          <div className={styles.trackItem} style={{ opacity: 0.5 }}>Loading…</div>
        ) : items.map((item) => (
          <div
            key={item.ratingKey}
            className={`${styles.trackItem} ${item.ratingKey === activeTrackRatingKey ? styles.trackItemActive : ''}`}
            onClick={() => {
              if (current.kind === 'artists') onArtistSelect(item);
              else if (current.kind === 'albums') onAlbumSelect(item);
              else onTrackSelect(item, items);
            }}
          >
            {(current.kind !== 'tracks') && item.thumb && (
              <img src={`/api/plex/thumb?path=${encodeURIComponent(item.thumb)}`} alt="" className={styles.albumThumb} onError={(e) => e.currentTarget.style.display = 'none'} />
            )}
            {current.kind === 'tracks' && (
              <span className={styles.trackIndex}>{item.index ?? '·'}</span>
            )}
            <span className={styles.trackTitle}>{item.title}</span>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}
