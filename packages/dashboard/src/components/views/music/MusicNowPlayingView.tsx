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
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null);
  const [recent, setRecent] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const apiKey = settings.lastfmApiKey as string | undefined;
  const user = settings.lastfmUser as string | undefined;

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchData(): Promise<void> {
      if (!apiKey || !user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/lastfm/recent?apiKey=${apiKey}&user=${encodeURIComponent(user)}&limit=8`);
        const data = await res.json();
        setNowPlaying(data.nowPlaying || null);
        setRecent(data.recent || []);
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

  const featured = nowPlaying || recent[0];
  if (!featured) {
    return <div className={styles.loading}>Keine Musik-Daten verfügbar</div>;
  }

  const recentList = nowPlaying ? recent.slice(0, 5) : recent.slice(1, 6);

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
            {nowPlaying && <div className={styles.nowPlayingBadge}>▶ Now Playing</div>}
            <div className={styles.trackName}>{featured.name}</div>
            <div className={styles.artistName}>{featured.artist}</div>
            <div className={styles.albumName}>{featured.album}</div>
          </div>
        </div>

        {recentList.length > 0 && (
          <div className={styles.recentList}>
            {recentList.map((track, i) => (
              <div key={`${track.name}-${i}`} className={styles.recentRow}>
                {track.image && (
                  <img src={track.image} alt="" className={styles.recentArt} />
                )}
                <div className={styles.recentInfo}>
                  <div className={styles.recentTrack}>{track.name}</div>
                  <div className={styles.recentArtist}>{track.artist}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
