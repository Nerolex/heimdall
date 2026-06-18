import { type FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { getSnapshot as getConcertsSnapshot } from '../services/concerts/snapshotStore.js';
import { getSnapshot as getEventsSnapshot } from '../services/events/snapshotStore.js';
import { resolveConfigPath, resolveProfileConfigPath } from '../utils/projectRoot.js';

const EVENT_SOURCES = new Set(['events-today', 'events-weekend', 'events-upcoming']);

type ShowcaseSource = 'concerts' | 'events-today' | 'events-weekend' | 'events-upcoming';

export async function showcaseRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { source?: string; days?: string; profile?: string } }>(
    '/api/showcase/snapshot',
    async (request, reply) => {
      const { source, profile } = request.query;

      if (!source) {
        return reply.status(400).send({
          error: 'Missing "source" query param. Must be one of: concerts, events-today, events-weekend, events-upcoming',
        });
      }

      if (source === 'concerts') {
        const result = loadConfig(profile ? resolveProfileConfigPath(profile) : resolveConfigPath());
        const concertsConfig = result.config?.providers?.concerts;
        if (!concertsConfig) {
          return reply.status(422).send({ error: 'Concerts provider not configured' });
        }
        const snapshot = getConcertsSnapshot();
        if (!snapshot) {
          return reply.status(404).send({ error: 'No snapshot available' });
        }
        return reply.send(snapshot);
      }

      if (EVENT_SOURCES.has(source)) {
        const result = loadConfig(profile ? resolveProfileConfigPath(profile) : resolveConfigPath());
        const eventsConfig = result.config?.providers?.events;
        if (!eventsConfig) {
          return reply.status(422).send({ error: 'Events provider not configured' });
        }
        const cities = Array.isArray(eventsConfig.cities) ? eventsConfig.cities : [eventsConfig.cities];
        const citiesKey = cities.join('+');
        const snapshot = getEventsSnapshot(citiesKey, source);
        if (!snapshot) {
          return reply.status(404).send({ error: 'No snapshot available for this source' });
        }
        return reply.send(snapshot);
      }

      return reply.status(400).send({
        error: `Invalid source "${source}". Must be one of: concerts, events-today, events-weekend, events-upcoming`,
      });
    },
  );
}
