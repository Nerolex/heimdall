import React, { useEffect, useRef, useState } from 'react';
import styles from './Plex.module.css';
import ra from './PlexRandomAlbum.module.css';
import type { PlexSession } from './plexTypes';
import { formatTime } from './usePlexPlayback';

export interface RandomAlbumData {
  album: PlexSession;
  tracks: PlexSession[];
}

interface Props {
  settings: Record<string, unknown>;
}

function MarqueeText({ text, wrapClass, textClass }: { text: string; wrapClass: string; textClass: string }) {
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
      <span ref={spanRef} className={`${textClass} ${scrolling ? ra.trackTitleScrolling : ''}`}>
        {text}
      </span>
    </div>
  );
}

export function PlexRandomAlbumView({ settings }: Props): React.ReactElement {
  const savedState = settings.__savedState as RandomAlbumData | undefined;
  const onStateChange = settings.__onStateChange as ((s: unknown) => void) | undefined;
  const onOpenDetail = settings.__onOpenDetail as (() => void) | undefined;

  const [data, setData] = useState<RandomAlbumData | null>(savedState ?? null);
  const [loading, setLoading] = useState(!savedState);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current || savedState) return;
    fetchedRef.current = true;

    fetch('/api/plex/random-album')
      .then((r) => r.json())
      .then((d: RandomAlbumData) => {
        if (d.album && d.tracks) {
          setData(d);
          onStateChange?.(d);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [savedState, onStateChange]);

  if (loading) return <div className={styles.container} />;

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.idle}>
          <div className={styles.idleIcon}>♪</div>
          <div className={styles.idleText}>Kein Album gefunden</div>
        </div>
      </div>
    );
  }

  const { album, tracks } = data;
  const thumb = album.thumb || album.parentThumb || '';
  const art = album.art || album.grandparentArt || '';
  const artistName = album.parentTitle || album.grandparentTitle || '';

  return (
    <div className={styles.container}>
      {art && (
        <img
          src={`/api/plex/thumb?path=${encodeURIComponent(art)}`}
          alt=""
          className={styles.bgArt}
        />
      )}
      <div className={ra.layout}>
        <div className={ra.leftCol}>
          <div className={ra.zuletztLabel}>Zuletzt gehört</div>
          {thumb && (
            <img
              src={`/api/plex/thumb?path=${encodeURIComponent(thumb)}`}
              alt={album.title}
              className={ra.cover}
              onClick={(e) => { e.stopPropagation(); onOpenDetail?.(); }}
              style={{ cursor: 'pointer' }}
            />
          )}
          {artistName && <div className={ra.artist}>{artistName}</div>}
          <div className={ra.albumName}>{album.title}</div>
        </div>
        <div className={ra.rightCol}>
          <div className={ra.trackList}>
            {tracks.map((track, i) => (
              <div key={track.ratingKey} className={ra.trackRow}>
                <span className={ra.trackNum}>{track.index ?? i + 1}</span>
                <MarqueeText
                  text={track.title}
                  wrapClass={ra.trackTitleWrap}
                  textClass={ra.trackTitle}
                />
                <span className={ra.trackDuration}>
                  {track.duration ? formatTime(track.duration) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
