import React, { useEffect, useState } from 'react';
import { withActiveProfile } from '../../../app/apiProfile';
import { RA_MEDIA, timeAgo } from './retroApi';
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

export function RetroRecentView(_props: Props): React.ReactElement {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const res = await fetch(withActiveProfile('/api/retro/recent-achievements'));
        const data = await res.json();
        if (Array.isArray(data)) setAchievements(data.slice(0, 3));
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
