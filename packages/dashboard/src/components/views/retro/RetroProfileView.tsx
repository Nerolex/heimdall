import React, { useEffect, useState } from 'react';
import { withActiveProfile } from '../../../app/apiProfile';
import { RA_MEDIA } from './retroApi';
import styles from './Retro.module.css';

interface UserSummary {
  User: string;
  TotalPoints: number;
  TotalTruePoints: number;
  Rank: number;
  RichPresenceMsg: string;
  RecentlyPlayed: Array<{
    GameID: number;
    Title: string;
    ConsoleName: string;
    ImageIcon: string;
  }>;
  Awarded: Record<string, { NumAchieved: number }>;
}

interface Props {
  settings: Record<string, unknown>;
}

export function RetroProfileView(_props: Props): React.ReactElement {
  const [profile, setProfile] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const res = await fetch(withActiveProfile('/api/retro/profile'));
        const data = await res.json();
        if (data.User) setProfile(data);
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

  if (!profile) {
    return <div className={styles.loading}>Profile unavailable</div>;
  }

  const avatarUrl = `https://retroachievements.org/UserPic/${profile.User}.png`;
  const totalAchievements = Object.values(profile.Awarded).reduce((sum, g) => sum + g.NumAchieved, 0);
  const stats = [
    { label: 'Punkte', value: profile.TotalPoints.toLocaleString(), icon: '⭐' },
    { label: 'True Points', value: profile.TotalTruePoints.toLocaleString(), icon: '💎' },
    { label: 'Achievements', value: totalAchievements.toLocaleString(), icon: '🏆' },
  ];

  return (
    <div className={styles.profileContainer} data-testid="retro-profile-view">
      <div className={styles.profileHeader}>
        <img src={avatarUrl} alt={profile.User} className={styles.avatar} />
        <div>
          <div className={styles.username}>{profile.User}</div>
          <div className={styles.rank}>Rang #{profile.Rank.toLocaleString()}</div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <div className={styles.statIcon}>{stat.icon}</div>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {profile.RichPresenceMsg && (
        <div className={styles.activityCard}>
          <div className={styles.activityLabel}>Aktuelle Aktivität</div>
          <div className={styles.activityMessage}>{profile.RichPresenceMsg}</div>
        </div>
      )}

      {profile.RecentlyPlayed.length > 0 && (
        <div className={styles.recentSection}>
          <div className={styles.recentLabel}>Zuletzt gespielt</div>
          <div className={styles.recentGames}>
            {profile.RecentlyPlayed.slice(0, window.innerHeight > 900 ? 5 : 3).map((game) => (
              <div key={game.GameID} className={styles.recentGame}>
                <img src={`${RA_MEDIA}${game.ImageIcon}`} alt="" className={styles.recentGameIcon} />
                <div className={styles.recentGameTitle}>{game.Title}</div>
                <div className={styles.recentGameConsole}>{game.ConsoleName}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
