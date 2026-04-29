import React, { useEffect, useState } from 'react';

const RA_MEDIA = '/api/retro/media';

interface UserSummary {
  User: string;
  TotalPoints: number;
  TotalSoftcorePoints: number;
  TotalTruePoints: number;
  Rank: number;
  MemberSince: string;
  RichPresenceMsg: string;
  LastGameID: number;
  RecentlyPlayedCount: number;
  RecentlyPlayed: Array<{
    GameID: number;
    Title: string;
    ConsoleName: string;
    ImageIcon: string;
    LastPlayed: string;
    AchievementsTotal: number;
  }>;
  Awarded: Record<string, {
    NumPossibleAchievements: number;
    NumAchieved: number;
    NumAchievedHardcore: number;
    ScoreAchieved: number;
    PossibleScore: number;
  }>;
}

interface RetroProfileViewProps {
  settings: Record<string, unknown>;
}

/** Profile summary view — rank, points, current activity, avatar */
export function RetroProfileView({ settings }: RetroProfileViewProps): React.ReactElement {
  const [profile, setProfile] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUser = settings.apiUser as string;
  const apiKey = settings.apiKey as string;
  const user = (settings.user as string) || apiUser;

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const res = await fetch(`/api/retro/profile?apiUser=${apiUser}&apiKey=${apiKey}&user=${user}`);
        const data = await res.json();
        if (data.User) setProfile(data);
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiUser, apiKey, user]);

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#111' }}>
        Loading…
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', background: '#111' }}>
        Profile unavailable
      </div>
    );
  }

  const avatarUrl = `https://retroachievements.org/UserPic/${profile.User}.png`;
  const totalAchievements = Object.values(profile.Awarded).reduce((sum, g) => sum + g.NumAchieved, 0);
  const lastGame = profile.RecentlyPlayed[0];

  return (
    <div
      data-testid="retro-profile-view"
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: '#fff',
        paddingTop: 'calc(var(--overlay-height, 0px) + 2vw)',
        paddingLeft: '4vw',
        paddingRight: '4vw',
        paddingBottom: '3vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2.5vw', marginBottom: '3vw' }}>
        <img
          src={avatarUrl}
          alt={profile.User}
          style={{
            width: '10vw',
            height: '10vw',
            borderRadius: '50%',
            border: '0.3vw solid rgba(255,215,0,0.5)',
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontSize: '4.5vw', fontWeight: 700 }}>{profile.User}</div>
          <div style={{ fontSize: '2.5vw', color: '#8899a6' }}>
            Rang #{profile.Rank.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '2vw',
        marginBottom: '3vw',
      }}>
        {[
          { label: 'Punkte', value: profile.TotalPoints.toLocaleString(), icon: '⭐' },
          { label: 'True Points', value: profile.TotalTruePoints.toLocaleString(), icon: '💎' },
          { label: 'Achievements', value: totalAchievements.toLocaleString(), icon: '🏆' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '0.8vw',
              padding: '2vw',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3.5vw', marginBottom: '0.3vw' }}>{stat.icon}</div>
            <div style={{ fontSize: '3.5vw', fontWeight: 700, color: '#ffd700' }}>{stat.value}</div>
            <div style={{ fontSize: '2vw', color: '#8899a6' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Rich Presence / Currently playing */}
      {profile.RichPresenceMsg && (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '0.8vw',
          padding: '2vw',
          marginBottom: '2vw',
        }}>
          <div style={{ fontSize: '2vw', color: '#8899a6', marginBottom: '0.5vw' }}>Aktuelle Aktivität</div>
          <div style={{ fontSize: '2.8vw', fontWeight: 500 }}>{profile.RichPresenceMsg}</div>
        </div>
      )}

      {/* Last played games */}
      {lastGame && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: '2.2vw', color: '#8899a6', marginBottom: '1vw' }}>Zuletzt gespielt</div>
          <div style={{ display: 'flex', gap: '2vw', overflow: 'hidden' }}>
            {profile.RecentlyPlayed.slice(0, 3).map((game) => (
              <div key={game.GameID} style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center' }}>
                <img
                  src={`${RA_MEDIA}${game.ImageIcon}`}
                  alt=""
                  style={{ width: '7vw', height: '7vw', borderRadius: '0.5vw', marginBottom: '0.5vw' }}
                />
                <div style={{
                  fontSize: '1.8vw',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {game.Title}
                </div>
                <div style={{ fontSize: '1.4vw', color: '#556' }}>{game.ConsoleName}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
