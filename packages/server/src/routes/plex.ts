import { type FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

interface PlexConfig {
  url: string;
  token: string;
}

function findConfigPath(): string {
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, 'config.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), 'config.json');
}

function getPlexConfig(): PlexConfig | null {
  const result = loadConfig(findConfigPath());
  if (!result.config?.plex?.url || !result.config?.plex?.token) return null;
  return { url: result.config.plex.url.replace(/\/$/, ''), token: result.config.plex.token };
}

export async function plexRoute(fastify: FastifyInstance): Promise<void> {
  // GET /api/plex/sessions — currently playing
  fastify.get('/api/plex/sessions', async (request, reply) => {
    const plex = getPlexConfig();
    if (!plex) return reply.status(503).send({ error: 'Plex not configured' });

    const res = await fetch(`${plex.url}/status/sessions?X-Plex-Token=${plex.token}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return reply.status(res.status).send({ error: 'Plex API error' });
    const data = await res.json();
    return data;
  });

  // POST /api/plex/playback — control playback (play, pause, skipNext, skipPrevious, stop)
  fastify.post<{ Body: { command: string; machineIdentifier?: string; playerAddress?: string; playerPort?: number; playerLocal?: boolean } }>(
    '/api/plex/playback',
    async (request, reply) => {
      const plex = getPlexConfig();
      if (!plex) return reply.status(503).send({ error: 'Plex not configured' });

      const { command, machineIdentifier, playerAddress, playerPort, playerLocal } = request.body;
      const validCommands = ['play', 'pause', 'stop', 'skipNext', 'skipPrevious'];
      if (!validCommands.includes(command)) {
        return reply.status(400).send({ error: `Invalid command. Valid: ${validCommands.join(', ')}` });
      }

      // Strategy 1: Send command directly to local player if address/port known
      if (playerLocal && playerAddress && playerPort) {
        const directUrl = `http://${playerAddress}:${playerPort}/player/playback/${command}`;
        const params = new URLSearchParams({
          commandID: '1',
          type: 'music',
          'X-Plex-Client-Identifier': 'heimdall-dashboard',
        });
        try {
          const res = await fetch(`${directUrl}?${params}`, {
            method: 'GET',
            headers: {
              'X-Plex-Target-Client-Identifier': machineIdentifier || '',
              'X-Plex-Token': plex.token,
            },
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok || res.status === 200) {
            return { success: true, command, method: 'direct' };
          }
        } catch {
          // Fall through to next strategy
        }
      }

      // Strategy 2: Use plex.tv command proxy for remote players
      if (machineIdentifier) {
        try {
          const proxyUrl = `https://plex.tv/player/proxy/playback/${command}`;
          const params = new URLSearchParams({
            commandID: '1',
            type: 'music',
            'X-Plex-Token': plex.token,
            'X-Plex-Client-Identifier': 'heimdall-dashboard',
            'X-Plex-Target-Client-Identifier': machineIdentifier,
          });
          const res = await fetch(`${proxyUrl}?${params}`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            return { success: true, command, method: 'plex-tv-proxy' };
          }
        } catch {
          // Fall through
        }
      }

      // Strategy 3: Try via PMS proxy endpoint
      if (machineIdentifier) {
        const pmsProxyUrl = `${plex.url}/player/proxy/playback/${command}`;
        const params = new URLSearchParams({
          commandID: '1',
          'X-Plex-Token': plex.token,
          'X-Plex-Client-Identifier': 'heimdall-dashboard',
          'X-Plex-Target-Client-Identifier': machineIdentifier,
        });
        try {
          const res = await fetch(`${pmsProxyUrl}?${params}`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            return { success: true, command, method: 'pms-proxy' };
          }
        } catch {
          // Fall through
        }
      }

      return reply.status(503).send({
        error: 'Player not controllable',
        detail: 'Could not reach the player. Remote players (e.g. Alexa) may not support direct control via Plex API.',
      });
    }
  );

  // GET /api/plex/thumb — proxy thumbnail to avoid CORS
  fastify.get<{ Querystring: { path: string } }>('/api/plex/thumb', async (request, reply) => {
    const plex = getPlexConfig();
    if (!plex) return reply.status(503).send({ error: 'Plex not configured' });

    const thumbPath = request.query.path;
    if (!thumbPath) return reply.status(400).send({ error: 'Missing path' });

    const res = await fetch(`${plex.url}${thumbPath}?X-Plex-Token=${plex.token}`);
    if (!res.ok) return reply.status(res.status).send({ error: 'Thumbnail fetch failed' });

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());
    return reply.type(contentType).send(buffer);
  });

  // GET /api/plex/stream?path=/library/parts/XXX/file.mp3 — proxy media stream for local playback
  fastify.get<{ Querystring: { path: string } }>('/api/plex/stream', async (request, reply) => {
    const plex = getPlexConfig();
    if (!plex) return reply.status(503).send({ error: 'Plex not configured' });

    const streamPath = request.query.path;
    if (!streamPath) return reply.status(400).send({ error: 'Missing path' });

    const url = `${plex.url}${streamPath}${streamPath.includes('?') ? '&' : '?'}X-Plex-Token=${plex.token}`;

    // Forward Range header to Plex for seeking support
    const headers: Record<string, string> = {};
    const rangeHeader = request.headers.range;
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const res = await fetch(url, { headers });
    if (!res.ok && res.status !== 206) return reply.status(res.status).send({ error: 'Stream fetch failed' });

    const contentType = res.headers.get('content-type') || 'audio/mpeg';
    const contentLength = res.headers.get('content-length');
    const contentRange = res.headers.get('content-range');
    const acceptRanges = res.headers.get('accept-ranges');

    reply.status(res.status);
    reply.type(contentType);
    if (contentLength) reply.header('content-length', contentLength);
    if (contentRange) reply.header('content-range', contentRange);
    reply.header('accept-ranges', acceptRanges || 'bytes');

    const buffer = Buffer.from(await res.arrayBuffer());
    return reply.send(buffer);
  });

  // GET /api/plex/children?path=/library/metadata/XXX/children — get album/show tracks
  fastify.get<{ Querystring: { path: string } }>('/api/plex/children', async (request, reply) => {
    const plex = getPlexConfig();
    if (!plex) return reply.status(503).send({ error: 'Plex not configured' });

    const childrenPath = request.query.path;
    if (!childrenPath) return reply.status(400).send({ error: 'Missing path' });

    const url = `${plex.url}${childrenPath}?X-Plex-Token=${plex.token}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return reply.status(res.status).send({ error: 'Children fetch failed' });
    return res.json();
  });

  // GET /api/plex/history — recently played music for primary account
  fastify.get<{ Querystring: { limit?: string } }>('/api/plex/history', async (request, reply) => {
    const plex = getPlexConfig();
    if (!plex) return reply.status(503).send({ error: 'Plex not configured' });

    const limit = request.query.limit || '20';
    const url = `${plex.url}/status/sessions/history/all?X-Plex-Token=${plex.token}&sort=viewedAt:desc&limit=${limit}&accountID=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return reply.status(res.status).send({ error: 'History fetch failed' });
    return res.json();
  });
}
