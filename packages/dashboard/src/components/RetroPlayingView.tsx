import React, { useEffect, useState } from 'react';

const RA_MEDIA = '/api/retro/media';

interface RecentGame {
  GameID: number;
  Title: string;
  ConsoleName: string;
  ImageIcon: string;
  ImageBoxArt: string;
  LastPlayed: string;
  AchievementsTotal: number;
  NumPossibleAchievements: number;
  NumAchieved: number;
  NumAchievedHardcore: number;
  ScoreAchieved: number;
  PossibleScore: number;
}

interface RetroPlayingViewProps {
  settings: Record<string, unknown>;
}

/** Currently playing view — recent games with progress bars */
export function RetroPlayingView({ settings }: RetroPlayingViewProps): React.ReactElement {
  const [games, setGames] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUser = settings.apiUser as string;
  const apiKey = settings.apiKey as string;
  const user = (settings.user as string) || apiUser;

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
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#111' }}>
        Loading…
      </div>
    );
  }

  // Filter games with achievements
  const gamesWithProgress = games.filter((g) => g.NumPossibleAchievements > 0);
  const featured = gamesWithProgress[0];

  return (
    <div
      data-testid="retro-playing-view"
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: '#fff',
        paddingTop: 'calc(var(--overlay-height, 0px) + 2vw)',
        paddingLeft: '3vw',
        paddingRight: '3vw',
        paddingBottom: '2vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1vw', marginBottom: '2vw' }}>
        <span style={{ fontSize: '2.5vw' }}>🎮</span>
        <span style={{ fontSize: '2.8vw', fontWeight: 700 }}>Aktuell gespielt</span>
      </div>

      {/* Featured game — large */}
      {featured && (
        <div style={{
          display: 'flex',
          gap: '2vw',
          marginBottom: '2vw',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '0.8vw',
          padding: '1.5vw',
          alignItems: 'center',
        }}>
          <img
            src={`${RA_MEDIA}${featured.ImageIcon}`}
            alt=""
            style={{ width: '8vw', height: '8vw', borderRadius: '0.5vw', flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '2.2vw', fontWeight: 700, marginBottom: '0.3vw' }}>{featured.Title}</div>
            <div style={{ fontSize: '1.3vw', color: '#8899a6', marginBottom: '1vw' }}>{featured.ConsoleName}</div>
            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
              <div style={{
                flex: 1,
                height: '1.2vw',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '0.6vw',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(featured.NumAchieved / featured.NumPossibleAchievements) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
                  borderRadius: '0.6vw',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: '1.4vw', fontWeight: 600, color: '#ffd700', flexShrink: 0 }}>
                {featured.NumAchieved}/{featured.NumPossibleAchievements}
              </span>
            </div>
            <div style={{ fontSize: '1.1vw', color: '#556', marginTop: '0.4vw' }}>
              {featured.ScoreAchieved}/{featured.PossibleScore} Punkte
            </div>
          </div>
        </div>
      )}

      {/* Other games */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.6vw' }}>
        {gamesWithProgress.slice(1).map((game) => {
          const pct = game.NumPossibleAchievements > 0
            ? Math.round((game.NumAchieved / game.NumPossibleAchievements) * 100)
            : 0;

          return (
            <div
              key={game.GameID}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1vw',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.4vw',
                padding: '0.6vw 1vw',
              }}
            >
              <img
                src={`${RA_MEDIA}${game.ImageIcon}`}
                alt=""
                style={{ width: '3.5vw', height: '3.5vw', borderRadius: '0.3vw', flexShrink: 0 }}
              />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '1.4vw', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {game.Title}
                </div>
                <div style={{ fontSize: '1vw', color: '#556' }}>{game.ConsoleName}</div>
              </div>
              {/* Mini progress */}
              <div style={{ width: '8vw', flexShrink: 0 }}>
                <div style={{
                  height: '0.8vw',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '0.4vw',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
                    borderRadius: '0.4vw',
                  }} />
                </div>
              </div>
              <span style={{ fontSize: '1.2vw', color: '#8899a6', flexShrink: 0 }}>
                {game.NumAchieved}/{game.NumPossibleAchievements}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
