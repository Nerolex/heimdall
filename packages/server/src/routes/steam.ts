import type { FastifyInstance } from 'fastify';

const STEAM_BASE = 'https://api.steampowered.com';

// Simple cache
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchSteam(url: string): Promise<unknown> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const data = await res.json();
  cache.set(url, { data, ts: Date.now() });
  return data;
}

export async function steamRoute(fastify: FastifyInstance): Promise<void> {
  // Player summary (online status, currently playing)
  fastify.get('/api/steam/player-summary', async (request, reply) => {
    const { apiKey, steamId } = request.query as { apiKey: string; steamId: string };
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

  // Recently played games
  fastify.get('/api/steam/recent-games', async (request, reply) => {
    const { apiKey, steamId, count } = request.query as { apiKey: string; steamId: string; count?: string };
    if (!apiKey || !steamId) return reply.status(400).send({ error: 'Missing apiKey or steamId' });

    try {
      const url = `${STEAM_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=${count || '10'}`;
      const data = await fetchSteam(url) as { response: { games?: Array<Record<string, unknown>> } };
      return reply.send(data.response.games || []);
    } catch (err) {
      return reply.status(502).send({ error: (err as Error).message });
    }
  });

  // Achievements for a specific game
  fastify.get('/api/steam/achievements', async (request, reply) => {
    const { apiKey, steamId, appId } = request.query as { apiKey: string; steamId: string; appId: string };
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
      // Some games don't have achievements
      return reply.send({ gameName: null, achievements: [], total: 0, unlocked: 0 });
    }
  });

  // Game schema (achievement names/descriptions/icons)
  fastify.get('/api/steam/game-schema', async (request, reply) => {
    const { apiKey, appId } = request.query as { apiKey: string; appId: string };
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
