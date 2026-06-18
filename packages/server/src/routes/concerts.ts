import { type FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { getSnapshot } from '../services/concerts/snapshotStore.js';
import { resolveConfigPath, resolveProfileConfigPath } from '../utils/projectRoot.js';

export async function concertsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { profile?: string } }>('/api/concerts/snapshot', async (request, reply) => {
    const result = loadConfig(request.query.profile ? resolveProfileConfigPath(request.query.profile) : resolveConfigPath());
    const concertsConfig = result.config?.providers?.concerts;
    
    if (!concertsConfig) {
      return reply.status(422).send({ error: 'Concerts provider not configured' });
    }

    const snapshot = getSnapshot();
    
    if (!snapshot) {
      return reply.status(404).send({ error: 'No snapshot available' });
    }

    return reply.status(200).send(snapshot);
  });

  fastify.get<{ Querystring: { profile?: string } }>('/api/concerts/health', async (request, reply) => {
    const result = loadConfig(request.query.profile ? resolveProfileConfigPath(request.query.profile) : resolveConfigPath());
    const concertsConfig = result.config?.providers?.concerts;
    
    if (!concertsConfig) {
      return reply.status(422).send({ error: 'Concerts provider not configured' });
    }

    const snapshot = getSnapshot();

    return reply.status(200).send({
      configured: !!concertsConfig.apiKey,
      lastRefreshed: snapshot?.refreshedAt ?? null,
      stale: snapshot?.stale ?? true,
      concertCount: snapshot?.concerts.length ?? 0,
      artistsTracked: snapshot?.artistsTracked.length ?? 0,
    });
  });

  // GET /api/concerts/artist-image/:mbid
  // Fetch artist image from Fanart.tv
  fastify.get<{ Params: { mbid: string } }>('/api/concerts/artist-image/:mbid', async (request, reply) => {
    const { mbid } = request.params;
    
    if (!mbid) {
      return reply.status(400).send({ error: 'MBID required' });
    }

    // Try Fanart.tv for artist background/thumb
    try {
      const url = `https://webservice.fanart.tv/v3/music/${mbid}?api_key=d2d1f4df4999d6ed9092452ce92e3a83`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json() as { 
          artistbackground?: Array<{ url: string }>;
          artistthumb?: Array<{ url: string }>;
          hdmusiclogo?: Array<{ url: string }>;
        };
        
        // Prefer artist background, fallback to thumb
        const imageUrl = data.artistbackground?.[0]?.url || data.artistthumb?.[0]?.url;
        
        if (imageUrl) {
          // Proxy the image to avoid CORS
          const imageResponse = await fetch(imageUrl);
          if (imageResponse.ok) {
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            const buffer = Buffer.from(await imageResponse.arrayBuffer());
            return reply.type(contentType).send(buffer);
          }
        }
      }
    } catch {
      // Continue to fallback
    }

    return reply.status(404).send({ error: 'No image found' });
  });
}
