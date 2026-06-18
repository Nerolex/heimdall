import React, { useEffect, useState } from 'react';
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

export function GamingRecentView(_props: Props): React.ReactElement {
  const [achievements, setAchievements] = useState<UnifiedAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        let maxItems: number;
        if (window.innerHeight < 650) maxItems = 4;
        else if (window.innerHeight < 900) maxItems = 6;
        else maxItems = 10;

        const res = await fetch(withActiveProfile(`/api/gaming/recent-achievements?limit=${maxItems}`));
        const data: UnifiedAchievement[] = await res.json();
        if (Array.isArray(data)) setAchievements(data);
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className={styles.loading}>Loading…</div>;

  if (achievements.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>🏆</span>
          <span className={styles.headerTitle}>Letzte Achievements</span>
        </div>
        <div className={styles.empty}>Keine Achievements in letzter Zeit</div>
      </div>
    );
  }

  const hero = achievements[0];
  const rest = achievements.slice(1);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>🏆</span>
        <span className={styles.headerTitle}>Letzte Achievements</span>
      </div>

      <div className={styles.heroAch}>
        {hero.icon && <img src={hero.icon} alt="" className={styles.heroAchIcon} />}
        {!hero.icon && <div className={styles.heroAchIconPlaceholder}>{hero.source === 'steam' ? '🎮' : '🕹️'}</div>}
        <div className={styles.heroAchInfo}>
          <div className={styles.heroAchTitle}>
            {hero.title}
            {hero.hardcore && <span className={styles.hardcoreStar}>⭐</span>}
          </div>
          <div className={styles.heroAchDesc}>{hero.description}</div>
          <div className={styles.heroAchGame}>
            {hero.gameName} · {hero.consoleName}
          </div>
        </div>
        <div className={styles.heroAchMeta}>
          {hero.points && <div className={styles.heroAchPoints}>{hero.points}</div>}
          <div className={styles.heroAchTime}>{timeAgo(hero.unlockedAt)}</div>
        </div>
      </div>

      <div className={styles.achList}>
        {rest.map((ach, i) => (
          <div key={`${ach.unlockedAt}-${i}`} className={styles.achRow}>
            {ach.icon ? (
              <img src={ach.icon} alt="" className={styles.achBadge} />
            ) : (
              <div className={styles.achBadgePlaceholder}>{ach.source === 'steam' ? '🎮' : '🕹️'}</div>
            )}
            <div className={styles.achInfo}>
              <div className={styles.achTitle}>
                {ach.title}
                {ach.hardcore && <span className={styles.hardcoreStar}>⭐</span>}
              </div>
              <div className={styles.achGame}>{ach.gameName} · {ach.consoleName}</div>
            </div>
            <div className={styles.achMeta}>
              {ach.points && <div className={styles.achPoints}>{ach.points}</div>}
              <div className={styles.achTime}>{timeAgo(ach.unlockedAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
