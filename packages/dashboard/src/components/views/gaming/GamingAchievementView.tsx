import React, { useEffect, useRef, useState } from 'react';
import styles from './Gaming.module.css';

interface UnifiedAchievement {
  title: string;
  description: string;
  gameName: string;
  consoleName: string;
  points?: number;
  icon?: string;
  unlockedAt: string;
  source: 'steam' | 'retro';
  hardcore?: boolean;
}

interface Props {
  settings: Record<string, unknown>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `vor ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours}h`;
  const days = Math.floor(hours / 24);
  return `vor ${days}d`;
}

export function GamingAchievementView({ settings }: Props): React.ReactElement {
  const [achievement, setAchievement] = useState<UnifiedAchievement | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
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
        params.set('limit', '20');

        const res = await fetch(`/api/gaming/recent-achievements?${params}`);
        const data: UnifiedAchievement[] = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          setLoading(false);
          return;
        }

        // Pick random achievement
        const picked = data[Math.floor(Math.random() * data.length)];
        setAchievement(picked);

        // Fetch background: prefer SGDB hero (always high-res), fallback to IGDB screenshot for modern games
        let foundBg = false;

        if (sgdbApiKey && picked.gameName) {
          try {
            const searchRes = await fetch(`/api/sgdb/search?apiKey=${sgdbApiKey}&term=${encodeURIComponent(picked.gameName)}`);
            const searchData = await searchRes.json();
            if (searchData.success && searchData.data?.length > 0) {
              const sgdbGameId = searchData.data[0].id;
              const heroRes = await fetch(`/api/sgdb/heroes?apiKey=${sgdbApiKey}&gameId=${sgdbGameId}`);
              const heroData = await heroRes.json();
              if (heroData.success && heroData.data?.length > 0) {
                const originalUrl = heroData.data[0].url as string;
                const path = originalUrl.replace('https://cdn2.steamgriddb.com/', '');
                setBgUrl(`/api/sgdb/media/${path}`);
                foundBg = true;
              }
            }
          } catch { /* ignore */ }
        }

        // Only use IGDB screenshot if no hero and it's a modern platform
        if (!foundBg && igdbClientId && igdbClientSecret && picked.gameName && picked.consoleName === 'Steam') {
          try {
            const igdbRes = await fetch(
              `/api/igdb/screenshots?clientId=${igdbClientId}&clientSecret=${igdbClientSecret}&game=${encodeURIComponent(picked.gameName)}`
            );
            const igdbData = await igdbRes.json();
            if (igdbData.success && igdbData.screenshots?.length > 0) {
              const shots = igdbData.screenshots;
              setBgUrl(shots[Math.floor(Math.random() * shots.length)].url);
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchData();
  }, [steamApiKey, steamId, raApiUser, raApiKey, raUser, sgdbApiKey]);

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (!achievement) return <div className={styles.loading}>Keine Achievements verfügbar</div>;

  const sourceIcon = achievement.source === 'steam' ? '🎮' : '🕹️';

  return (
    <div className={styles.showcaseContainer}>
      {bgUrl ? (
        <div className={styles.showcaseBg} style={{ backgroundImage: `url(${bgUrl})` }} />
      ) : (
        <div className={styles.achShowcaseFallbackBg} />
      )}
      <div className={styles.achShowcaseOverlay}>
        <div className={styles.achShowcaseContent}>
          <div className={styles.achShowcaseTitle}>
            {achievement.title}
            {achievement.hardcore && <span className={styles.hardcoreStar}>⭐</span>}
          </div>
          <div className={styles.achShowcaseDesc}>{achievement.description}</div>
          <div className={styles.achShowcaseGame}>
            {sourceIcon} {achievement.gameName} · {achievement.consoleName}
          </div>
          <div className={styles.achShowcaseMeta}>
            {achievement.points && <span className={styles.achShowcasePoints}>{achievement.points} Punkte</span>}
            <span className={styles.achShowcaseTime}>{timeAgo(achievement.unlockedAt)}</span>
          </div>
        </div>
        <div className={styles.achShowcaseBadge}>
          {achievement.icon ? (
            <img src={achievement.icon} alt="" className={styles.achShowcaseIcon} />
          ) : (
            <div className={styles.achShowcaseIconPlaceholder}>{sourceIcon}</div>
          )}
        </div>
      </div>
    </div>
  );
}
