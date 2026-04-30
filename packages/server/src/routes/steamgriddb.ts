import { type FastifyInstance } from 'fastify';

const SGDB_BASE = 'https://www.steamgriddb.com/api/v2';

// Simple cache
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour (images don't change often)

async function fetchSGDB(endpoint: string, apiKey: string): Promise<unknown> {
  const url = `${SGDB_BASE}${endpoint}`;
  const cacheKey = url;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`SteamGridDB error: ${res.status}`);
  const data = await res.json();
  cache.set(cacheKey, { data, ts: Date.now() });
  return data;
}

interface SGDBQuery {
  apiKey?: string;
  term?: string;
  gameId?: string;
}

export async function steamGridDBRoute(fastify: FastifyInstance): Promise<void> {
  // GET /api/sgdb/search?apiKey=...&term=...
  fastify.get<{ Querystring: SGDBQuery }>('/api/sgdb/search', async (request) => {
    const { apiKey, term } = request.query;
    if (!apiKey || !term) return { error: 'Missing apiKey or term' };

    const data = await fetchSGDB(`/search/autocomplete/${encodeURIComponent(term)}`, apiKey);
    return data;
  });

  // GET /api/sgdb/heroes?apiKey=...&gameId=...
  fastify.get<{ Querystring: SGDBQuery }>('/api/sgdb/heroes', async (request) => {
    const { apiKey, gameId } = request.query;
    if (!apiKey || !gameId) return { error: 'Missing apiKey or gameId' };

    const data = await fetchSGDB(`/heroes/game/${gameId}?dimensions=1920x620,1600x650`, apiKey);
    return data;
  });

  // Proxy SGDB images to avoid CORS
  fastify.get<{ Params: { '*': string } }>('/api/sgdb/media/*', async (request, reply) => {
    const imagePath = request.params['*'];
    const url = `https://cdn2.steamgriddb.com/${imagePath}`;
    const res = await fetch(url);
    if (!res.ok) return reply.status(404).send({ error: 'Image not found' });

    const contentType = res.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await res.arrayBuffer());
    return reply.type(contentType).send(buffer);
  });
}
