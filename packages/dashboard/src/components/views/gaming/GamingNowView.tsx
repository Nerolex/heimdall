import React, { useEffect, useState } from 'react';
import { withActiveProfile } from '../../../app/apiProfile';
import styles from './Gaming.module.css';

interface NowPlayingData {
  source: 'steam' | 'retro' | null;
  gameName: string | null;
  gameId: string | null;
  richPresence?: string;
  appId?: number;
}

interface Props {
  settings: Record<string, unknown>;
}

export function GamingNowView(_props: Props): React.ReactElement {
  const [data, setData] = useState<NowPlayingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const res = await fetch(withActiveProfile('/api/gaming/now-playing'));
        const result: NowPlayingData = await res.json();
        setData(result);

        if (result.gameName) {
          try {
            const searchRes = await fetch(withActiveProfile(`/api/sgdb/search?term=${encodeURIComponent(result.gameName)}`));
            const searchData = await searchRes.json();
            if (searchData.success && searchData.data?.length > 0) {
              const sgdbGameId = searchData.data[0].id;
              const heroRes = await fetch(withActiveProfile(`/api/sgdb/heroes?gameId=${sgdbGameId}`));
              const heroData = await heroRes.json();
              if (heroData.success && heroData.data?.length > 0) {
                const originalUrl = heroData.data[0].url as string;
                const path = originalUrl.replace('https://cdn2.steamgriddb.com/', '');
                setHeroUrl(`/api/sgdb/media/${path}`);
              }
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchData();
    const interval = setInterval(fetchData, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className={styles.loading}>Loading…</div>;

  if (!data || !data.source) {
    return (
      <div className={styles.nowContainer}>
        <div className={styles.nowIdle}>
          <div className={styles.nowIdleIcon}>🎮</div>
          <div className={styles.nowIdleText}>Gerade nichts am Spielen</div>
        </div>
      </div>
    );
  }

  const sourceLabel = data.source === 'steam' ? 'Steam' : 'RetroAchievements';
  const sourceIcon = data.source === 'steam' ? '🎮' : '🕹️';

  return (
    <div className={styles.nowContainer}>
      {heroUrl && <div className={styles.nowHero} style={{ backgroundImage: `url(${heroUrl})` }} />}
      <div className={styles.nowOverlay}>
        <div className={styles.nowBadge}>
          <span>{sourceIcon}</span> Spielt gerade
        </div>
        <div className={styles.nowGameName}>{data.gameName}</div>
        {data.richPresence && (
          <div className={styles.nowRichPresence}>{data.richPresence}</div>
        )}
        <div className={styles.nowSource}>{sourceLabel}</div>
      </div>
    </div>
  );
}
