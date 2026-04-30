import React, { useEffect, useRef, useState } from 'react';
import { RA_MEDIA, extractRetroSettings } from './retroApi';
import styles from './Retro.module.css';

interface RecentGame {
  GameID: number;
  Title: string;
  ConsoleName: string;
  ImageIcon: string;
  NumPossibleAchievements: number;
  NumAchieved: number;
}

interface GameInfo {
  Title: string;
  ConsoleName: string;
  ImageIngame: string;
  ImageTitle: string;
  ImageBoxArt: string;
  NumAchievements: number;
  NumAwardedToUser: number;
}

interface Props {
  settings: Record<string, unknown>;
}

export function RetroShowcaseView({ settings }: Props): React.ReactElement {
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { apiUser, apiKey, user } = extractRetroSettings(settings);
  const igdbClientId = settings.igdbClientId as string | undefined;
  const igdbClientSecret = settings.igdbClientSecret as string | undefined;
  const sgdbApiKey = settings.sgdbApiKey as string | undefined;
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchData(): Promise<void> {
      try {
        // Get recent games
        const res = await fetch(`/api/retro/recent-games?apiUser=${apiUser}&apiKey=${apiKey}&user=${user}&count=10`);
        const games: RecentGame[] = await res.json();
        if (!Array.isArray(games) || games.length === 0) {
          setLoading(false);
          return;
        }

        // Pick random game
        const game = games[Math.floor(Math.random() * games.length)];

        // Fetch RA game info for progress
        const infoRes = await fetch(
          `/api/retro/game-info?apiUser=${apiUser}&apiKey=${apiKey}&user=${user}&gameId=${game.GameID}`
        );
        const info = await infoRes.json();
        if (info.Title) setGameInfo(info);

        // Fetch SGDB hero as background
        if (sgdbApiKey && info.Title) {
          try {
            const searchRes = await fetch(`/api/sgdb/search?apiKey=${sgdbApiKey}&term=${encodeURIComponent(info.Title)}`);
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

        // Fetch IGDB screenshot as inset
        if (igdbClientId && igdbClientSecret && info.Title) {
          try {
            const igdbRes = await fetch(
              `/api/igdb/screenshots?clientId=${igdbClientId}&clientSecret=${igdbClientSecret}&game=${encodeURIComponent(info.Title)}`
            );
            const igdbData = await igdbRes.json();
            if (igdbData.success && igdbData.screenshots?.length > 0) {
              const screenshots = igdbData.screenshots;
              setScreenshotUrl(screenshots[Math.floor(Math.random() * screenshots.length)].url);
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchData();
  }, [apiUser, apiKey, user, igdbClientId, igdbClientSecret, sgdbApiKey]);

  if (loading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (!gameInfo) {
    return <div className={styles.loading}>Keine Spieldaten verfügbar</div>;
  }

  if (!gameInfo || !heroUrl) {
    return <div className={styles.loading}>Kein Bild verfügbar</div>;
  }

  const progress = gameInfo.NumAchievements > 0
    ? Math.round((gameInfo.NumAwardedToUser / gameInfo.NumAchievements) * 100)
    : 0;

  return (
    <div className={styles.showcaseContainer} data-testid="retro-showcase-view">
      <div
        className={styles.showcaseImage}
        style={{ backgroundImage: `url(${heroUrl})` }}
      />
      <div className={styles.showcaseOverlay}>
        <div className={styles.showcaseInfo}>
          <div className={styles.showcaseTitle}>{gameInfo.Title}</div>
          <div className={styles.showcaseConsole}>{gameInfo.ConsoleName}</div>
          {gameInfo.NumAchievements > 0 && (
            <div className={styles.showcaseProgress}>
              <div className={styles.showcaseProgressBar}>
                <div className={styles.showcaseProgressFill} style={{ width: `${progress}%` }} />
              </div>
              <span className={styles.showcaseProgressLabel}>
                {gameInfo.NumAwardedToUser}/{gameInfo.NumAchievements} ({progress}%)
              </span>
            </div>
          )}
        </div>
        {screenshotUrl && (
          <div className={styles.showcaseScreenshot}>
            <img src={screenshotUrl} alt={`${gameInfo.Title} screenshot`} />
          </div>
        )}
      </div>
    </div>
  );
}
