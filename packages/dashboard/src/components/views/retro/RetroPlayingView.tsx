import React, { useEffect, useState } from 'react';
import { RA_MEDIA, extractRetroSettings } from './retroApi';
import styles from './Retro.module.css';

interface RecentGame {
  GameID: number;
  Title: string;
  ConsoleName: string;
  ImageIcon: string;
  LastPlayed: string;
  NumPossibleAchievements: number;
  NumAchieved: number;
  ScoreAchieved: number;
  PossibleScore: number;
}

interface Props {
  settings: Record<string, unknown>;
}

export function RetroPlayingView({ settings }: Props): React.ReactElement {
  const [games, setGames] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(true);
  const { apiUser, apiKey, user } = extractRetroSettings(settings);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const res = await fetch(`/api/retro/recent-games?apiUser=${apiUser}&apiKey=${apiKey}&user=${user}&count=5`);
        const data = await res.json();
        if (Array.isArray(data)) setGames(data);
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

  const gamesWithProgress = games.filter((g) => g.NumPossibleAchievements > 0);
  const featured = gamesWithProgress[0];

  return (
    <div className={styles.container} data-testid="retro-playing-view">
      <div className={styles.header}>
        <span className={styles.headerIcon}>🎮</span>
        <span className={styles.headerTitle}>Aktuell gespielt</span>
      </div>

      {featured && (
        <div className={styles.featuredCard}>
          <img src={`${RA_MEDIA}${featured.ImageIcon}`} alt="" className={styles.featuredIcon} />
          <div className={styles.featuredInfo}>
            <div className={styles.featuredTitle}>{featured.Title}</div>
            <div className={styles.featuredConsole}>{featured.ConsoleName}</div>
            <div className={styles.progressRow}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(featured.NumAchieved / featured.NumPossibleAchievements) * 100}%` }}
                />
              </div>
              <span className={styles.progressLabel}>
                {featured.NumAchieved}/{featured.NumPossibleAchievements}
              </span>
            </div>
            <div className={styles.progressPoints}>
              {featured.ScoreAchieved}/{featured.PossibleScore} Punkte
            </div>
          </div>
        </div>
      )}

      <div className={styles.secondaryList}>
        {gamesWithProgress.slice(1, 3).map((game) => {
          const pct = Math.round((game.NumAchieved / game.NumPossibleAchievements) * 100);
          return (
            <div key={game.GameID} className={styles.secondaryRow}>
              <img src={`${RA_MEDIA}${game.ImageIcon}`} alt="" className={styles.secondaryIcon} />
              <div className={styles.secondaryInfo}>
                <div className={styles.secondaryTitle}>{game.Title}</div>
                <div className={styles.secondaryConsole}>{game.ConsoleName}</div>
              </div>
              <div className={styles.miniProgress}>
                <div className={styles.miniProgressBar}>
                  <div className={styles.miniProgressFill} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className={styles.miniLabel}>{game.NumAchieved}/{game.NumPossibleAchievements}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
