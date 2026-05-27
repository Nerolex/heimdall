import React, { useEffect, useRef, useState } from 'react';
import styles from './Music.module.css';

interface Track {
  name: string;
  artist: string;
  album: string;
  image: string;
  url?: string;
  date?: string;
  timestamp?: number;
}

interface Props {
  settings: Record<string, unknown>;
}

export function MusicNowPlayingView({ settings }: Props): React.ReactElement {
  const [featured, setFeatured] = useState<Track | null>(null);
  const [isNowPlaying, setIsNowPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const savedStateRef = useRef(settings.__savedState as { featured: Track; isNowPlaying: boolean } | undefined);
  const onStateChangeRef = useRef(settings.__onStateChange as ((s: unknown) => void) | undefined);

  const apiKey = settings.lastfmApiKey as string | undefined;
  const user = settings.lastfmUser as string | undefined;

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    if (savedStateRef.current?.featured) {
      setFeatured(savedStateRef.current.featured);
      setIsNowPlaying(savedStateRef.current.isNowPlaying);
      setLoading(false);
      return;
    }

    async function fetchData(): Promise<void> {
      if (!apiKey || !user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/lastfm/recent?apiKey=${apiKey}&user=${encodeURIComponent(user)}&limit=8`);
        const data = await res.json();
        const nowPlaying: Track | null = data.nowPlaying || null;
        const recent: Track[] = data.recent || [];
        const track = nowPlaying || (recent.length > 0 ? recent[Math.floor(Math.random() * recent.length)] : null);
        if (track) {
          setFeatured(track);
          setIsNowPlaying(!!nowPlaying);
          onStateChangeRef.current?.({ featured: track, isNowPlaying: !!nowPlaying });
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchData();
  }, [apiKey, user]);

  if (loading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (!apiKey || !user) {
    return <div className={styles.loading}>Last.fm nicht konfiguriert</div>;
  }

  if (!featured) {
    return <div className={styles.loading}>Keine Musik-Daten verfügbar</div>;
  }

  return (
    <div className={styles.container} data-testid="music-now-playing-view">
      {/* Album art background */}
      {featured.image && (
        <div
          className={styles.backgroundImage}
          style={{ backgroundImage: `url(${featured.image})` }}
        />
      )}
      <div className={styles.overlay}>
        <div className={styles.main}>
          {featured.image && (
            <img src={featured.image} alt="" className={styles.albumArt} />
          )}
          <div className={styles.trackInfo}>
            {isNowPlaying && <div className={styles.nowPlayingBadge}>▶ Now Playing</div>}
            <div className={styles.trackName}>{featured.name}</div>
            <div className={styles.artistName}>{featured.artist}</div>
            <div className={styles.albumName}>{featured.album}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
