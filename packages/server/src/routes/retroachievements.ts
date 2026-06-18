import { type FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { resolveConfigPath, resolveProfileConfigPath } from '../utils/projectRoot.js';

const RA_BASE = 'https://retroachievements.org/API';
const MEDIA_BASE = 'https://media.retroachievements.org';

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchRA(endpoint: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${RA_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`RA API error: ${res.status}`);
  const data = await res.json();
  cache.set(cacheKey, { data, ts: Date.now() });
  return data;
}

function raCredentials(query: { apiUser?: string; apiKey?: string; user?: string; profile?: string }) {
  const result = loadConfig(query.profile ? resolveProfileConfigPath(query.profile) : resolveConfigPath());
  const fromConfig = result.config?.retro;
  return {
    z: fromConfig?.apiUser || query.apiUser || '',
    y: fromConfig?.apiKey || query.apiKey || '',
    u: fromConfig?.user || query.user || fromConfig?.apiUser || query.apiUser || '',
  };
}

export async function retroAchievementsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { user?: string; apiUser?: string; apiKey?: string } }>('/api/retro/profile', async (request) => {
    const { z, y, u } = raCredentials(request.query);
    if (!z || !y) return { error: 'Missing apiUser/apiKey' };

    const data = await fetchRA('API_GetUserSummary.php', {
      z, y, u, g: '5', a: '10',
    });
    return data;
  });

  fastify.get<{ Querystring: { user?: string; apiUser?: string; apiKey?: string; minutes?: string } }>('/api/retro/recent-achievements', async (request) => {
    const { z, y, u } = raCredentials(request.query);
    if (!z || !y) return { error: 'Missing apiUser/apiKey' };

    const minutes = request.query.minutes || '43200';
    const data = await fetchRA('API_GetUserRecentAchievements.php', {
      z, y, u, m: minutes,
    });
    return data;
  });

  fastify.get<{ Querystring: { user?: string; apiUser?: string; apiKey?: string; count?: string } }>('/api/retro/recent-games', async (request) => {
    const { z, y, u } = raCredentials(request.query);
    if (!z || !y) return { error: 'Missing apiUser/apiKey' };

    const count = request.query.count || '10';
    const data = await fetchRA('API_GetUserRecentlyPlayedGames.php', {
      z, y, u, c: count,
    });
    return data;
  });

  fastify.get<{ Querystring: { user?: string; apiUser?: string; apiKey?: string; gameId: string } }>('/api/retro/game-info', async (request) => {
    const { z, y, u } = raCredentials(request.query);
    if (!z || !y) return { error: 'Missing apiUser/apiKey' };

    const gameId = request.query.gameId;
    if (!gameId) return { error: 'Missing gameId' };

    const data = await fetchRA('API_GetGameInfoAndUserProgress.php', {
      z, y, u, g: gameId,
    });
    return data;
  });

  // Proxy RA media images to avoid CORS issues
  fastify.get<{ Params: { '*': string } }>('/api/retro/media/*', async (request, reply) => {
    const imagePath = request.params['*'];
    const url = `${MEDIA_BASE}/${imagePath}`;
    const res = await fetch(url);
    if (!res.ok) return reply.status(404).send({ error: 'Image not found' });

    const contentType = res.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await res.arrayBuffer());
    return reply.type(contentType).send(buffer);
  });
}
