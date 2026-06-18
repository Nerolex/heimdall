import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { resolveConfigPath, resolveProfileConfigPath } from '../utils/projectRoot.js';

const STEAM_BASE = 'https://api.steampowered.com';

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchSteam(url: string): Promise<unknown> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const data = await res.json();
  cache.set(url, { data, ts: Date.now() });
  return data;
}

function steamCredentials(query: { apiKey?: string; steamId?: string; profile?: string }) {
  const result = loadConfig(query.profile ? resolveProfileConfigPath(query.profile) : resolveConfigPath());
  const fromConfig = result.config?.steam;
  return {
    apiKey: fromConfig?.apiKey || query.apiKey || '',
    steamId: fromConfig?.steamId || query.steamId || '',
  };
}

export async function steamRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/steam/player-summary', async (request, reply) => {
    const { apiKey, steamId } = steamCredentials(request.query as { apiKey?: string; steamId?: string; profile?: string });
    if (!apiKey || !steamId) return reply.status(400).send({ error: 'Missing apiKey or steamId' });

    try {
      const url = `${STEAM_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`;
      const data = await fetchSteam(url) as { response: { players: Array<Record<string, unknown>> } };
      const player = data.response.players[0];
      if (!player) return reply.status(404).send({ error: 'Player not found' });

      return reply.send({
        name: player.personaname,
        avatar: player.avatarfull,
        status: player.personastate,
        currentGame: player.gameextrainfo || null,
        currentGameId: player.gameid || null,
      });
    } catch (err) {
      return reply.status(502).send({ error: (err as Error).message });
    }
  });

  fastify.get('/api/steam/recent-games', async (request, reply) => {
    const { apiKey, steamId } = steamCredentials(request.query as { apiKey?: string; steamId?: string; profile?: string });
    const count = (request.query as { count?: string }).count;
    if (!apiKey || !steamId) return reply.status(400).send({ error: 'Missing apiKey or steamId' });

    try {
      const url = `${STEAM_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=${count || '10'}`;
      const data = await fetchSteam(url) as { response: { games?: Array<Record<string, unknown>> } };
      return reply.send(data.response.games || []);
    } catch (err) {
      return reply.status(502).send({ error: (err as Error).message });
    }
  });

  fastify.get('/api/steam/achievements', async (request, reply) => {
    const { apiKey, steamId } = steamCredentials(request.query as { apiKey?: string; steamId?: string; profile?: string });
    const appId = (request.query as { appId?: string }).appId;
    if (!apiKey || !steamId || !appId) return reply.status(400).send({ error: 'Missing apiKey, steamId, or appId' });

    try {
      const url = `${STEAM_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key=${apiKey}&steamid=${steamId}&appid=${appId}&l=german`;
      const data = await fetchSteam(url) as { playerstats: { achievements?: Array<Record<string, unknown>>; gameName?: string } };
      const achievements = (data.playerstats.achievements || [])
        .filter((a: Record<string, unknown>) => a.achieved === 1)
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (b.unlocktime as number) - (a.unlocktime as number));

      return reply.send({
        gameName: data.playerstats.gameName,
        achievements,
        total: (data.playerstats.achievements || []).length,
        unlocked: achievements.length,
      });
    } catch (err) {
      return reply.send({ gameName: null, achievements: [], total: 0, unlocked: 0 });
    }
  });

  fastify.get('/api/steam/game-schema', async (request, reply) => {
    const { apiKey } = steamCredentials(request.query as { apiKey?: string; profile?: string });
    const appId = (request.query as { appId?: string }).appId;
    if (!apiKey || !appId) return reply.status(400).send({ error: 'Missing apiKey or appId' });

    try {
      const url = `${STEAM_BASE}/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${appId}&l=german`;
      const data = await fetchSteam(url) as { game: { availableGameStats?: { achievements?: Array<Record<string, unknown>> } } };
      const achievements = data.game.availableGameStats?.achievements || [];
      return reply.send({ achievements });
    } catch (err) {
      return reply.send({ achievements: [] });
    }
  });
}
