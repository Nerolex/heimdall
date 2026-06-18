import { type FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { resolveConfigPath, resolveProfileConfigPath } from '../utils/projectRoot.js';

const SGDB_BASE = 'https://www.steamgriddb.com/api/v2';

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000;

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

function sgdbApiKey(query: { apiKey?: string; profile?: string }): string | undefined {
  const result = loadConfig(query.profile ? resolveProfileConfigPath(query.profile) : resolveConfigPath());
  return result.config?.sgdb?.apiKey || query.apiKey;
}

export async function steamGridDBRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { apiKey?: string; term?: string } }>('/api/sgdb/search', async (request) => {
    const apiKey = sgdbApiKey(request.query);
    const term = request.query.term;
    if (!apiKey || !term) return { error: 'Missing apiKey or term' };

    const data = await fetchSGDB(`/search/autocomplete/${encodeURIComponent(term)}`, apiKey);
    return data;
  });

  fastify.get<{ Querystring: { apiKey?: string; gameId?: string } }>('/api/sgdb/heroes', async (request) => {
    const apiKey = sgdbApiKey(request.query);
    const gameId = request.query.gameId;
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
