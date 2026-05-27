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
  ImageIcon?: string;
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

  const savedStateRef = useRef(settings.__savedState as { gameInfo: GameInfo; heroUrl: string | null; screenshotUrl: string | null } | undefined);
  const onStateChangeRef = useRef(settings.__onStateChange as ((s: unknown) => void) | undefined);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    if (savedStateRef.current?.gameInfo) {
      setGameInfo(savedStateRef.current.gameInfo);
      setHeroUrl(savedStateRef.current.heroUrl);
      setScreenshotUrl(savedStateRef.current.screenshotUrl);
      setLoading(false);
      return;
    }

    async function fetchData(): Promise<void> {
      try {
        const res = await fetch(`/api/retro/recent-games?apiUser=${apiUser}&apiKey=${apiKey}&user=${user}&count=10`);
        const games: RecentGame[] = await res.json();
        if (!Array.isArray(games) || games.length === 0) {
          setLoading(false);
          return;
        }

        const isPlaceholder = (img: string) => !img || /\/Images\/00000[0-9]\.png$/.test(img);
        const validGames = games.filter(g => !isPlaceholder(g.ImageIcon));
        const pool = validGames.length > 0 ? validGames : games;
        const game = pool[Math.floor(Math.random() * pool.length)];

        const infoRes = await fetch(
          `/api/retro/game-info?apiUser=${apiUser}&apiKey=${apiKey}&user=${user}&gameId=${game.GameID}`
        );
        const info = await infoRes.json();
        if (info.Title) setGameInfo(info);

        let finalHeroUrl: string | null = null;
        let finalScreenshotUrl: string | null = null;

        const heroPromise = (sgdbApiKey && info.Title) ? (async () => {
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
                finalHeroUrl = `/api/sgdb/media/${path}`;
              }
            }
          } catch { /* ignore */ }
        })() : Promise.resolve();

        const screenshotPromise = (igdbClientId && igdbClientSecret && info.Title) ? (async () => {
          try {
            const igdbRes = await fetch(
              `/api/igdb/screenshots?clientId=${igdbClientId}&clientSecret=${igdbClientSecret}&game=${encodeURIComponent(info.Title)}`
            );
            const igdbData = await igdbRes.json();
            if (igdbData.success && igdbData.screenshots?.length > 0) {
              const screenshots = igdbData.screenshots;
              finalScreenshotUrl = screenshots[Math.floor(Math.random() * screenshots.length)].url;
            }
          } catch { /* ignore */ }
        })() : Promise.resolve();

        await Promise.all([heroPromise, screenshotPromise]);

        if (finalHeroUrl) setHeroUrl(finalHeroUrl);
        if (finalScreenshotUrl) setScreenshotUrl(finalScreenshotUrl);
        if (info.Title) {
          onStateChangeRef.current?.({ gameInfo: info, heroUrl: finalHeroUrl, screenshotUrl: finalScreenshotUrl });
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

  // Fall back to RA's own images if no SGDB hero found (skip placeholders)
  const isPlaceholderImg = (img: string) => !img || /\/Images\/00000[0-9]\.png$/.test(img);
  const backgroundUrl = heroUrl
    || (!isPlaceholderImg(gameInfo.ImageIngame) ? `${RA_MEDIA}${gameInfo.ImageIngame}` : null)
    || (!isPlaceholderImg(gameInfo.ImageTitle) ? `${RA_MEDIA}${gameInfo.ImageTitle}` : null)
    || (!isPlaceholderImg(gameInfo.ImageBoxArt) ? `${RA_MEDIA}${gameInfo.ImageBoxArt}` : null);

  const useFallback = !backgroundUrl;
  const iconUrl = `${RA_MEDIA}${gameInfo.ImageIcon}`;

  // Screenshot fallback: IGDB > RA ingame (if not placeholder)
  const displayScreenshot = screenshotUrl
    || (!isPlaceholderImg(gameInfo.ImageIngame) ? `${RA_MEDIA}${gameInfo.ImageIngame}` : null);

  const progress = gameInfo.NumAchievements > 0
    ? Math.round((gameInfo.NumAwardedToUser / gameInfo.NumAchievements) * 100)
    : 0;

  return (
    <div className={styles.showcaseContainer} data-testid="retro-showcase-view">
      {useFallback ? (
        <div className={styles.showcaseFallback}>
          <img src={iconUrl} alt="" className={styles.showcaseFallbackIcon} />
        </div>
      ) : (
        <div
          className={styles.showcaseImage}
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
      )}
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
        {displayScreenshot && (
          <div className={styles.showcaseScreenshot}>
            <img src={displayScreenshot} alt={`${gameInfo.Title} screenshot`} />
          </div>
        )}
      </div>
    </div>
  );
}
