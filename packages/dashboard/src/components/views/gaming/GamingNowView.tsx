import React, { useEffect, useState } from 'react';
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

export function GamingNowView({ settings }: Props): React.ReactElement {
  const [data, setData] = useState<NowPlayingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  const steamApiKey = settings.steamApiKey as string | undefined;
  const steamId = settings.steamId as string | undefined;
  const raApiUser = settings.raApiUser as string | undefined;
  const raApiKey = settings.raApiKey as string | undefined;
  const raUser = settings.raUser as string | undefined;
  const sgdbApiKey = settings.sgdbApiKey as string | undefined;

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const params = new URLSearchParams();
        if (steamApiKey && steamId) {
          params.set('steamApiKey', steamApiKey);
          params.set('steamId', steamId);
        }
        if (raApiUser && raApiKey && raUser) {
          params.set('raApiUser', raApiUser);
          params.set('raApiKey', raApiKey);
          params.set('raUser', raUser);
        }

        const res = await fetch(`/api/gaming/now-playing?${params}`);
        const result: NowPlayingData = await res.json();
        setData(result);

        // Try to get hero art from SGDB
        if (result.gameName && sgdbApiKey) {
          try {
            const searchRes = await fetch(`/api/sgdb/search?apiKey=${sgdbApiKey}&term=${encodeURIComponent(result.gameName)}`);
            const searchData = await searchRes.json();
            if (searchData.success && searchData.data?.length > 0) {
              const sgdbGameId = searchData.data[0].id;
              const heroRes = await fetch(`/api/sgdb/heroes?apiKey=${sgdbApiKey}&gameId=${sgdbGameId}`);
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
    const interval = setInterval(fetchData, 30 * 1000); // Poll every 30s for live status
    return () => clearInterval(interval);
  }, [steamApiKey, steamId, raApiUser, raApiKey, raUser, sgdbApiKey]);

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
