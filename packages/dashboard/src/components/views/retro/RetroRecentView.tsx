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
        if (Array.isArray(data)) setAchievements(data.slice(0, 5));
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
          {achievements.map((ach) => (
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
