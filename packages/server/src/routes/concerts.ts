import { type FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { getSnapshot } from '../services/concerts/snapshotStore.js';
import { resolveConfigPath } from '../utils/projectRoot.js';

export async function concertsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/concerts/snapshot', async (_request, reply) => {
    const result = loadConfig(resolveConfigPath());
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

  fastify.get('/api/concerts/health', async (_request, reply) => {
    const result = loadConfig(resolveConfigPath());
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
}
