import React, { useEffect, useRef, useState } from 'react';
import { withActiveProfile } from '../../../app/apiProfile';
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

  const savedStateRef = useRef(settings.__savedState as { achievement: UnifiedAchievement; bgUrl: string | null } | undefined);
  const onStateChangeRef = useRef(settings.__onStateChange as ((s: unknown) => void) | undefined);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    if (savedStateRef.current?.achievement) {
      setAchievement(savedStateRef.current.achievement);
      setBgUrl(savedStateRef.current.bgUrl);
      setLoading(false);
      return;
    }

    async function fetchData(): Promise<void> {
      try {
        const res = await fetch(withActiveProfile('/api/gaming/recent-achievements?limit=20'));
        const data: UnifiedAchievement[] = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          setLoading(false);
          return;
        }

        const picked = data[Math.floor(Math.random() * data.length)];
        setAchievement(picked);

        let finalBgUrl: string | null = null;
        let foundBg = false;

        if (picked.gameName) {
          try {
            const searchRes = await fetch(withActiveProfile(`/api/sgdb/search?term=${encodeURIComponent(picked.gameName)}`));
            const searchData = await searchRes.json();
            if (searchData.success && searchData.data?.length > 0) {
              const sgdbGameId = searchData.data[0].id;
              const heroRes = await fetch(withActiveProfile(`/api/sgdb/heroes?gameId=${sgdbGameId}`));
              const heroData = await heroRes.json();
              if (heroData.success && heroData.data?.length > 0) {
                const originalUrl = heroData.data[0].url as string;
                const path = originalUrl.replace('https://cdn2.steamgriddb.com/', '');
                finalBgUrl = `/api/sgdb/media/${path}`;
                foundBg = true;
              }
            }
          } catch { /* ignore */ }
        }

        if (!foundBg && picked.gameName && picked.consoleName === 'Steam') {
          try {
            const igdbRes = await fetch(withActiveProfile(`/api/igdb/screenshots?game=${encodeURIComponent(picked.gameName)}`));
            const igdbData = await igdbRes.json();
            if (igdbData.success && igdbData.screenshots?.length > 0) {
              const shots = igdbData.screenshots;
              finalBgUrl = shots[Math.floor(Math.random() * shots.length)].url;
            }
          } catch { /* ignore */ }
        }

        if (finalBgUrl) setBgUrl(finalBgUrl);
        onStateChangeRef.current?.({ achievement: picked, bgUrl: finalBgUrl });
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchData();
  }, [settings.__savedState, settings.__onStateChange]);

  if (loading) return <div className={styles.showcaseContainer} />;
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
