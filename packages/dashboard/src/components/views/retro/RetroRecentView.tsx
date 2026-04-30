import React, { useEffect, useState } from 'react';
import { RA_MEDIA, extractRetroSettings, timeAgo } from './retroApi';
import styles from './Retro.module.css';

interface Achievement {
  Date: string;
  Title: string;
  Description: string;
  Points: number;
  BadgeName: string;
  GameTitle: string;
  GameIcon: string;
  GameID: number;
  ConsoleName: string;
  BadgeURL: string;
  HardcoreMode: number;
}

interface Props {
  settings: Record<string, unknown>;
}

export function RetroRecentView({ settings }: Props): React.ReactElement {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { apiUser, apiKey, user } = extractRetroSettings(settings);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const res = await fetch(`/api/retro/recent-achievements?apiUser=${apiUser}&apiKey=${apiKey}&user=${user}&minutes=43200`);
        const data = await res.json();
        const maxItems = window.innerHeight > 900 ? 8 : window.innerHeight > 600 ? 6 : 5;
        if (Array.isArray(data)) setAchievements(data.slice(0, maxItems));
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiUser, apiKey, user]);

  if (loading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  return (
    <div className={styles.container} data-testid="retro-recent-view">
      <div className={styles.header}>
        <span className={styles.headerIcon}>🏆</span>
        <span className={styles.headerTitle}>Letzte Achievements</span>
      </div>

      {achievements.length === 0 ? (
        <div className={styles.empty}>Keine Achievements in letzter Zeit</div>
      ) : (
        <div className={styles.achievementList}>
          {/* Hero: first achievement */}
          <div className={styles.achievementHero}>
            <img src={`${RA_MEDIA}${achievements[0].BadgeURL}`} alt="" className={styles.heroImage} />
            <div className={styles.heroInfo}>
              <div className={styles.heroTitle}>
                {achievements[0].Title}
                {achievements[0].HardcoreMode === 1 && <span className={styles.hardcoreStar}>⭐</span>}
              </div>
              <div className={styles.heroDescription}>{achievements[0].Description}</div>
              <div className={styles.heroGame}>{achievements[0].GameTitle} · {achievements[0].ConsoleName}</div>
            </div>
            <div className={styles.heroPoints}>
              <div className={styles.heroPointsValue}>{achievements[0].Points}</div>
              <div className={styles.timeAgo}>{timeAgo(achievements[0].Date)}</div>
            </div>
          </div>

          {/* Rest: compact list */}
          {achievements.slice(1).map((ach) => (
            <div key={ach.Date + ach.Title} className={styles.achievementRow}>
              <img src={`${RA_MEDIA}${ach.BadgeURL}`} alt="" className={styles.badge} />
              <div className={styles.achievementInfo}>
                <div className={styles.achievementTitle}>
                  {ach.Title}
                  {ach.HardcoreMode === 1 && <span className={styles.hardcoreStar}>⭐</span>}
                </div>
                <div className={styles.achievementGame}>{ach.GameTitle} · {ach.ConsoleName}</div>
              </div>
              <div className={styles.pointsBlock}>
                <div className={styles.points}>{ach.Points}</div>
                <div className={styles.timeAgo}>{timeAgo(ach.Date)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
