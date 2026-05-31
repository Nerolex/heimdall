import React, { useEffect, useRef, useState } from 'react';
import styles from './Plex.module.css';
import ra from './PlexRandomAlbum.module.css';
import detailStyles from '../../detail/Detail.module.css';
import type { PlexSession } from './plexTypes';
import { formatTime, usePlexPlayback } from './usePlexPlayback';
import type { RandomAlbumData } from './PlexRandomAlbumView';

function MarqueeText({ text, wrapClass, textClass, activeClass }: { text: string; wrapClass: string; textClass: string; activeClass?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const w = wrapRef.current;
    const s = spanRef.current;
    if (!w || !s) return;
    const overflow = s.scrollWidth - w.clientWidth;
    if (overflow > 4) {
      s.style.setProperty('--marquee-offset', `-${overflow}px`);
      setScrolling(true);
    } else {
      setScrolling(false);
    }
  }, [text]);

  return (
    <div ref={wrapRef} className={wrapClass}>
      <span ref={spanRef} className={`${textClass}${activeClass ? ` ${activeClass}` : ''}${scrolling ? ` ${ra.detailTrackTitleScrolling}` : ''}`}>
        {text}
      </span>
    </div>
  );
}

interface Props {
  settings: Record<string, unknown>;
  onClose: () => void;
}

export function PlexRandomAlbumDetailView({ settings, onClose }: Props): React.ReactElement {
  const savedState = settings.__savedState as RandomAlbumData | undefined;

  const [trackQueue, setTrackQueue] = useState<PlexSession[]>(savedState?.tracks ?? []);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Local-only history management — does not touch global sharedHistory
  const replaceHistory = (items: PlexSession[], idx: number) => {
    setTrackQueue(items);
    setHistoryIndex(idx);
  };

  const {
    audioRef,
    displayItem,
    localPlaying,
    localProgress,
    localDuration,
    handlePlay,
    handleSkip,
    handleSeek,
    playSelectedTrack,
  } = usePlexPlayback({
    session: null,
    history: trackQueue,
    historyIndex,
    setHistoryIndex,
    replaceHistory,
  });

  if (!savedState) {
    return (
      <div className={detailStyles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className={styles.idle}>
          <div className={styles.idleIcon}>♪</div>
          <div className={styles.idleText}>Kein Album geladen</div>
        </div>
        <button className={detailStyles.closeButton} onClick={onClose}>✕</button>
      </div>
    );
  }

  const { album, tracks } = savedState;
  const thumb = album.thumb || album.parentThumb || '';
  const art = album.art || album.grandparentArt || '';
  const artistName = album.parentTitle || album.grandparentTitle || '';
  const progress = localDuration > 0 ? (localProgress / localDuration) * 100 : 0;
  const activeKey = displayItem?.ratingKey;

  async function handleTrackClick(track: PlexSession): Promise<void> {
    await playSelectedTrack(track, trackQueue);
  }

  return (
    <div
      className={detailStyles.container}
      style={{ display: 'flex', flexDirection: 'column' }}
      onClick={onClose}
    >
      <audio ref={audioRef} preload="none" />
      {art && (
        <img
          src={`/api/plex/thumb?path=${encodeURIComponent(art)}`}
          alt=""
          className={styles.bgArt}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.3)', transform: 'scale(1.2)', zIndex: 0 }}
        />
      )}

      <div className={ra.detailLayout} onClick={(e) => e.stopPropagation()}>
        <div className={ra.detailTop}>
          {/* Left: cover + info */}
          <div className={ra.detailLeft}>
            {thumb && (
              <img
                src={`/api/plex/thumb?path=${encodeURIComponent(thumb)}`}
                alt={album.title}
                className={ra.detailCover}
              />
            )}
            {artistName && <div className={ra.detailArtist}>{artistName}</div>}
            <div className={ra.detailAlbumName}>{album.title}</div>
          </div>

          {/* Right: scrollable track list */}
          <div className={ra.detailRight}>
            <div className={ra.detailTrackList}>
              {tracks.map((track, i) => {
                const isActive = track.ratingKey === activeKey;
                return (
                  <div
                    key={track.ratingKey}
                    className={`${ra.detailTrackRow} ${isActive ? ra.detailTrackRowActive : ''}`}
                    onClick={() => handleTrackClick(track)}
                  >
                    <span className={ra.detailTrackNum}>
                      {isActive && localPlaying ? '▶' : (track.index ?? i + 1)}
                    </span>
                    <MarqueeText
                      text={track.title}
                      wrapClass={ra.detailTrackTitleWrap}
                      textClass={ra.detailTrackTitle}
                      activeClass={isActive ? ra.detailTrackRowActive : undefined}
                    />
                    <span className={ra.detailTrackDuration}>
                      {isActive && localDuration > 0
                        ? formatTime(localProgress)
                        : track.duration
                          ? formatTime(track.duration)
                          : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom: progress + controls */}
        <div className={ra.detailControls}>
          <div className={styles.progressContainer}>
            <span className={styles.time}>{formatTime(localProgress)}</span>
            <div className={styles.progressBar} onClick={handleSeek} style={{ cursor: 'pointer' }}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.time}>{formatTime(localDuration)}</span>
          </div>
          <div className={styles.controls}>
            <button className={styles.controlBtn} onClick={() => handleSkip(-1)}>⏮</button>
            <button
              className={`${styles.controlBtnLarge} ${localPlaying ? styles.controlBtnPause : styles.controlBtnPlay}`}
              onClick={handlePlay}
            >
              {localPlaying ? '⏸' : '▶'}
            </button>
            <button className={styles.controlBtn} onClick={() => handleSkip(1)}>⏭</button>
          </div>
        </div>
      </div>

      <button className={detailStyles.closeButton} onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
    </div>
  );
}
