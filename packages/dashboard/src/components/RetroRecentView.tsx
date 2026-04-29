import React, { useEffect, useState } from 'react';

const RA_MEDIA = '/api/retro/media';

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

interface RetroRecentViewProps {
  settings: Record<string, unknown>;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr + ' UTC');
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `vor ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours}h`;
  const days = Math.floor(hours / 24);
  return `vor ${days}d`;
}

/** Recent achievements view — latest unlocked achievements */
export function RetroRecentView({ settings }: RetroRecentViewProps): React.ReactElement {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUser = settings.apiUser as string;
  const apiKey = settings.apiKey as string;
  const user = (settings.user as string) || apiUser;

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
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#111' }}>
        Loading…
      </div>
    );
  }

  return (
    <div
      data-testid="retro-recent-view"
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5vw', marginBottom: '2.5vw' }}>
        <span style={{ fontSize: '4vw' }}>🏆</span>
        <span style={{ fontSize: '4vw', fontWeight: 700 }}>Letzte Achievements</span>
      </div>

      {achievements.length === 0 ? (
        <div style={{ color: '#666', fontSize: '3vw' }}>Keine Achievements in letzter Zeit</div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1.2vw' }}>
          {achievements.map((ach) => (
            <div
              key={ach.Date + ach.Title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5vw',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '0.8vw',
                padding: '1.2vw 1.5vw',
              }}
            >
              {/* Badge */}
              <img
                src={`${RA_MEDIA}${ach.BadgeURL}`}
                alt=""
                style={{ width: '5.5vw', height: '5.5vw', borderRadius: '0.4vw', flexShrink: 0 }}
              />
              {/* Info */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '2.5vw', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ach.Title}
                  {ach.HardcoreMode === 1 && <span style={{ color: '#ffd700', marginLeft: '0.5vw' }}>⭐</span>}
                </div>
                <div style={{ fontSize: '1.8vw', color: '#8899a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ach.GameTitle} · {ach.ConsoleName}
                </div>
              </div>
              {/* Points + time */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '2.2vw', fontWeight: 700, color: '#ffd700' }}>{ach.Points}</div>
                <div style={{ fontSize: '1.6vw', color: '#556' }}>{timeAgo(ach.Date)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
