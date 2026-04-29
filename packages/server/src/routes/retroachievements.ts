import { type FastifyInstance } from 'fastify';

const RA_BASE = 'https://retroachievements.org/API';
const MEDIA_BASE = 'https://media.retroachievements.org';

interface RAQuery {
  user?: string;
  apiUser?: string;
  apiKey?: string;
}

function getCredentials(query: RAQuery): { z: string; y: string; u: string } | null {
  const z = query.apiUser || '';
  const y = query.apiKey || '';
  const u = query.user || z;
  if (!z || !y) return null;
  return { z, y, u };
}

// Simple cache: key → { data, timestamp }
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

export async function retroAchievementsRoute(fastify: FastifyInstance): Promise<void> {
  // GET /api/retro/profile
  fastify.get<{ Querystring: RAQuery }>('/api/retro/profile', async (request) => {
    const creds = getCredentials(request.query);
    if (!creds) return { error: 'Missing apiUser/apiKey' };

    const data = await fetchRA('API_GetUserSummary.php', {
      z: creds.z, y: creds.y, u: creds.u, g: '5', a: '10',
    });
    return data;
  });

  // GET /api/retro/recent-achievements
  fastify.get<{ Querystring: RAQuery & { minutes?: string } }>('/api/retro/recent-achievements', async (request) => {
    const creds = getCredentials(request.query);
    if (!creds) return { error: 'Missing apiUser/apiKey' };

    const minutes = request.query.minutes || '43200'; // default 30 days
    const data = await fetchRA('API_GetUserRecentAchievements.php', {
      z: creds.z, y: creds.y, u: creds.u, m: minutes,
    });
    return data;
  });

  // GET /api/retro/recent-games
  fastify.get<{ Querystring: RAQuery & { count?: string } }>('/api/retro/recent-games', async (request) => {
    const creds = getCredentials(request.query);
    if (!creds) return { error: 'Missing apiUser/apiKey' };

    const count = request.query.count || '10';
    const data = await fetchRA('API_GetUserRecentlyPlayedGames.php', {
      z: creds.z, y: creds.y, u: creds.u, c: count,
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
