import React, { useEffect, useRef, useState } from 'react';
import styles from './Gaming.module.css';

interface GameCandidate {
  name: string;
  consoleName: string;
  source: 'steam' | 'retro';
  appId?: number;
  raGameId?: number;
  achievements?: { earned: number; total: number };
}

interface Props {
  settings: Record<string, unknown>;
}

export function GamingShowcaseView({ settings }: Props): React.ReactElement {
  const [game, setGame] = useState<GameCandidate | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const steamApiKey = settings.steamApiKey as string | undefined;
  const steamId = settings.steamId as string | undefined;
  const raApiUser = settings.raApiUser as string | undefined;
  const raApiKey = settings.raApiKey as string | undefined;
  const raUser = settings.raUser as string | undefined;
  const sgdbApiKey = settings.sgdbApiKey as string | undefined;
  const igdbClientId = settings.igdbClientId as string | undefined;
  const igdbClientSecret = settings.igdbClientSecret as string | undefined;

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

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

        const res = await fetch(`/api/gaming/showcase-game?${params}`);
        const data = await res.json();
        if (!data.game) { setLoading(false); return; }

        const picked = data.game as GameCandidate;
        setGame(picked);

        // Fetch art in parallel
        const heroPromise = sgdbApiKey ? (async () => {
          try {
            const searchRes = await fetch(`/api/sgdb/search?apiKey=${sgdbApiKey}&term=${encodeURIComponent(picked.name)}`);
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
        })() : Promise.resolve();

        const screenshotPromise = (igdbClientId && igdbClientSecret) ? (async () => {
          try {
            const igdbRes = await fetch(
              `/api/igdb/screenshots?clientId=${igdbClientId}&clientSecret=${igdbClientSecret}&game=${encodeURIComponent(picked.name)}`
            );
            const igdbData = await igdbRes.json();
            if (igdbData.success && igdbData.screenshots?.length > 0) {
              const shots = igdbData.screenshots;
              setScreenshotUrl(shots[Math.floor(Math.random() * shots.length)].url);
            }
          } catch { /* ignore */ }
        })() : Promise.resolve();

        await Promise.all([heroPromise, screenshotPromise]);

        // For Steam games without SGDB hero, use Steam library hero (high-res)
        if (!heroUrl && picked.source === 'steam' && picked.appId) {
          setHeroUrl(`https://steamcdn-a.akamaihd.net/steam/apps/${picked.appId}/library_hero.jpg`);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchData();
  }, [steamApiKey, steamId, raApiUser, raApiKey, raUser, sgdbApiKey, igdbClientId, igdbClientSecret]);

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (!game) return <div className={styles.loading}>Keine Spieldaten verfügbar</div>;

  const progress = game.achievements && game.achievements.total > 0
    ? Math.round((game.achievements.earned / game.achievements.total) * 100)
    : null;

  // Use Steam header as fallback background
  const bgUrl = heroUrl || (game.source === 'steam' && game.appId
    ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.appId}/library_hero.jpg`
    : null);

  const sourceIcon = game.source === 'steam' ? '🎮' : '🕹️';

  return (
    <div className={styles.showcaseContainer}>
      {bgUrl ? (
        <div className={styles.showcaseBg} style={{ backgroundImage: `url(${bgUrl})` }} />
      ) : (
        <div className={styles.showcaseFallbackBg} />
      )}
      <div className={styles.showcaseOverlay}>
        <div className={styles.showcaseInfo}>
          <div className={styles.showcaseSource}>{sourceIcon} {game.consoleName}</div>
          <div className={styles.showcaseTitle}>{game.name}</div>
          {progress !== null && (
            <div className={styles.showcaseProgress}>
              <div className={styles.showcaseProgressBar}>
                <div className={styles.showcaseProgressFill} style={{ width: `${progress}%` }} />
              </div>
              <span className={styles.showcaseProgressLabel}>
                {game.achievements!.earned}/{game.achievements!.total} ({progress}%)
              </span>
            </div>
          )}
        </div>
        {screenshotUrl && (
          <div className={styles.showcaseScreenshot}>
            <img src={screenshotUrl} alt={`${game.name} screenshot`} />
          </div>
        )}
      </div>
    </div>
  );
}
