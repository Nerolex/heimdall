import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { resolveConfigPath, resolveProfileConfigPath } from '../utils/projectRoot.js';

const RA_BASE = 'https://retroachievements.org/API';
const STEAM_BASE = 'https://api.steampowered.com';

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function cachedFetch(url: string): Promise<unknown> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  cache.set(url, { data, ts: Date.now() });
  return data;
}

interface NowPlayingResult {
  source: 'steam' | 'retro' | null;
  gameName: string | null;
  gameId: string | null;
  richPresence?: string;
  appId?: number;
}

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

function gamingCreds(query: Record<string, string>) {
  const result = loadConfig(query.profile ? resolveProfileConfigPath(query.profile) : resolveConfigPath());
  const config = result.config;
  return {
    steamApiKey: config?.steam?.apiKey || query.steamApiKey || '',
    steamId: config?.steam?.steamId || query.steamId || '',
    raApiUser: config?.retro?.apiUser || query.raApiUser || '',
    raApiKey: config?.retro?.apiKey || query.raApiKey || '',
    raUser: config?.retro?.user || query.raUser || '',
  };
}

export async function gamingRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/gaming/now-playing', async (request, reply) => {
    const { steamApiKey, steamId, raApiUser, raApiKey, raUser } = gamingCreds(request.query as Record<string, string>);

    const result: NowPlayingResult = { source: null, gameName: null, gameId: null };

    if (steamApiKey && steamId) {
      try {
        const url = `${STEAM_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId}`;
        const data = await cachedFetch(url) as { response: { players: Array<Record<string, unknown>> } };
        const player = data.response.players[0];
        if (player?.gameextrainfo) {
          result.source = 'steam';
          result.gameName = player.gameextrainfo as string;
          result.appId = parseInt(player.gameid as string, 10);
          result.gameId = player.gameid as string;
          return reply.send(result);
        }
      } catch { /* ignore */ }
    }

    if (raApiUser && raApiKey && raUser) {
      try {
        const url = `${RA_BASE}/API_GetUserSummary.php?z=${raApiUser}&y=${raApiKey}&u=${raUser}`;
        const data = await cachedFetch(url) as Record<string, unknown>;
        if (data.RichPresenceMsg && data.LastGameID) {
          result.source = 'retro';
          result.gameName = (data.LastGame as Record<string, unknown>)?.Title as string || null;
          result.gameId = String(data.LastGameID);
          result.richPresence = data.RichPresenceMsg as string;
          return reply.send(result);
        }
      } catch { /* ignore */ }
    }

    return reply.send(result);
  });

  fastify.get('/api/gaming/recent-achievements', async (request, reply) => {
    const { steamApiKey, steamId, raApiUser, raApiKey, raUser } = gamingCreds(request.query as Record<string, string>);
    const maxItems = parseInt((request.query as Record<string, string>).limit || '10', 10);
    const achievements: UnifiedAchievement[] = [];

    if (raApiUser && raApiKey && raUser) {
      try {
        const url = `${RA_BASE}/API_GetUserRecentAchievements.php?z=${raApiUser}&y=${raApiKey}&u=${raUser}&m=43200`;
        const data = await cachedFetch(url) as Array<Record<string, unknown>>;
        if (Array.isArray(data)) {
          for (const ach of data) {
            achievements.push({
              title: ach.Title as string,
              description: ach.Description as string,
              gameName: ach.GameTitle as string,
              consoleName: ach.ConsoleName as string,
              points: ach.Points as number,
              icon: `/api/retro/media${ach.BadgeURL as string}`,
              unlockedAt: new Date((ach.Date as string) + ' UTC').toISOString(),
              source: 'retro',
              hardcore: ach.HardcoreMode === 1,
            });
          }
        }
      } catch { /* ignore */ }
    }

    if (steamApiKey && steamId) {
      try {
        const gamesUrl = `${STEAM_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${steamApiKey}&steamid=${steamId}&count=5`;
        const gamesData = await cachedFetch(gamesUrl) as { response: { games?: Array<Record<string, unknown>> } };
        const games = gamesData.response.games || [];

        const gamePromises = games.map(async (game) => {
          const appId = game.appid as number;
          try {
            const [achData, schemaData] = await Promise.all([
              cachedFetch(`${STEAM_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${appId}&l=german`),
              cachedFetch(`${STEAM_BASE}/ISteamUserStats/GetSchemaForGame/v2/?key=${steamApiKey}&appid=${appId}&l=german`),
            ]) as [
              { playerstats: { achievements?: Array<Record<string, unknown>>; gameName?: string } },
              { game: { availableGameStats?: { achievements?: Array<Record<string, unknown>> } } }
            ];

            const playerAchs = (achData.playerstats.achievements || []).filter(
              (a: Record<string, unknown>) => a.achieved === 1
            );
            const schemaAchs = schemaData.game.availableGameStats?.achievements || [];
            const schemaMap = new Map(schemaAchs.map((s: Record<string, unknown>) => [s.name, s]));

            const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
            for (const ach of playerAchs) {
              const unlockTime = (ach.unlocktime as number) * 1000;
              if (unlockTime < thirtyDaysAgo) continue;
              const schema = schemaMap.get(ach.apiname as string) as Record<string, unknown> | undefined;
              achievements.push({
                title: (schema?.displayName as string) || (ach.apiname as string),
                description: (schema?.description as string) || '',
                gameName: achData.playerstats.gameName || (game.name as string),
                consoleName: 'Steam',
                icon: schema?.icon as string | undefined,
                unlockedAt: new Date(unlockTime).toISOString(),
                source: 'steam',
              });
            }
          } catch { /* some games don't support achievements */ }
        });

        await Promise.all(gamePromises);
      } catch { /* ignore */ }
    }

    achievements.sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());
    return reply.send(achievements.slice(0, maxItems));
  });

  fastify.get('/api/gaming/showcase-game', async (request, reply) => {
    const { steamApiKey, steamId, raApiUser, raApiKey, raUser } = gamingCreds(request.query as Record<string, string>);

    interface GameCandidate {
      name: string;
      consoleName: string;
      source: 'steam' | 'retro';
      appId?: number;
      raGameId?: number;
      achievements?: { earned: number; total: number };
    }

    const candidates: GameCandidate[] = [];

    if (raApiUser && raApiKey && raUser) {
      try {
        const url = `${RA_BASE}/API_GetUserRecentlyPlayedGames.php?z=${raApiUser}&y=${raApiKey}&u=${raUser}&c=10`;
        const data = await cachedFetch(url) as Array<Record<string, unknown>>;
        if (Array.isArray(data)) {
          for (const g of data) {
            if (/\/Images\/00000[0-9]\.png$/.test(g.ImageIcon as string || '')) continue;
            candidates.push({
              name: g.Title as string,
              consoleName: g.ConsoleName as string,
              source: 'retro',
              raGameId: g.GameID as number,
              achievements: {
                earned: g.NumAchieved as number || 0,
                total: g.NumPossibleAchievements as number || 0,
              },
            });
          }
        }
      } catch { /* ignore */ }
    }

    if (steamApiKey && steamId) {
      try {
        const url = `${STEAM_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${steamApiKey}&steamid=${steamId}&count=10`;
        const data = await cachedFetch(url) as { response: { games?: Array<Record<string, unknown>> } };
        for (const g of (data.response.games || [])) {
          candidates.push({
            name: g.name as string,
            consoleName: 'Steam',
            source: 'steam',
            appId: g.appid as number,
          });
        }
      } catch { /* ignore */ }
    }

    if (candidates.length === 0) {
      return reply.send({ game: null });
    }

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    return reply.send({ game: picked });
  });
}
