import { type FastifyInstance } from 'fastify';

const IGDB_BASE = 'https://api.igdb.com/v4';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

// Token cache
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const res = await fetch(
    `${TOKEN_URL}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST' },
  );
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 - 60000 };
  return tokenCache.token;
}

// Game search cache
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface IGDBQuery {
  clientId?: string;
  clientSecret?: string;
  game?: string;
}

export async function igdbRoute(fastify: FastifyInstance): Promise<void> {
  // GET /api/igdb/screenshots?clientId=...&clientSecret=...&game=Super Mario World
  fastify.get<{ Querystring: IGDBQuery }>('/api/igdb/screenshots', async (request) => {
    const { clientId, clientSecret, game } = request.query;
    if (!clientId || !clientSecret || !game) return { error: 'Missing clientId, clientSecret, or game' };

    const cacheKey = `igdb:${game}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

    const token = await getToken(clientId, clientSecret);

    // Try full name first, then fallback to name before colon
    const searchTerms = [game];
    if (game.includes(':')) searchTerms.push(game.split(':')[0].trim());
    // Also clean special chars like ~ for hack games
    const cleanBase = game.replace(/[~]/g, '').replace(/^Hack\s*/i, '').trim();
    if (!searchTerms.includes(cleanBase)) searchTerms.push(cleanBase);

    let match: { name: string; screenshots?: Array<{ image_id: string }>; artworks?: Array<{ image_id: string }> } | null = null;

    for (const term of searchTerms) {
      const res = await fetch(`${IGDB_BASE}/games`, {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: `search "${term}"; fields name,screenshots.image_id,artworks.image_id; limit 5;`,
      });

      const results = (await res.json()) as Array<{
        name: string;
        screenshots?: Array<{ image_id: string }>;
        artworks?: Array<{ image_id: string }>;
      }>;

      // Find best match: prefer name containing our search, with screenshots
      const gameLower = game.toLowerCase();
      match = results.find((g) => g.name.toLowerCase() === gameLower && g.screenshots?.length)
        || results.find((g) => gameLower.includes(g.name.toLowerCase()) && g.screenshots?.length)
        || results.find((g) => g.name.toLowerCase().includes(term.toLowerCase()) && g.screenshots?.length)
        || results.find((g) => g.screenshots?.length)
        || null;

      if (match) break;
    }

    if (!match || !match.screenshots?.length) {
      return { success: false, screenshots: [], artworks: [] };
    }

    const result = {
      success: true,
      name: match.name,
      screenshots: match.screenshots.map((s) => ({
        url: `https://images.igdb.com/igdb/image/upload/t_1080p/${s.image_id}.jpg`,
        thumb: `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`,
      })),
      artworks: (match.artworks || []).map((a) => ({
        url: `https://images.igdb.com/igdb/image/upload/t_1080p/${a.image_id}.jpg`,
      })),
    };

    cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  });
}
