import { type FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { getSnapshot } from '../services/events/snapshotStore.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { RefreshStatus } from '@heimdall/shared';

const ALLOWED_TYPES = ['events-today', 'events-weekend', 'events-upcoming'] as const;

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

export async function eventsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { type?: string; days?: string } }>(
    '/api/events/snapshot',
    async (request, reply) => {
      const { type, days: daysStr } = request.query;

      if (!type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
        return reply.status(400).send({
          error:
            'Invalid or missing "type" query param. Must be one of: events-today, events-weekend, events-upcoming',
        });
      }

      const result = loadConfig(findConfigPath());
      const eventsConfig = result.config?.providers?.events;
      if (!eventsConfig) {
        return reply.status(422).send({ error: 'Events provider not configured' });
      }

      const snapshot = getSnapshot(eventsConfig.city, type);
      if (!snapshot) {
        return reply.status(404).send({ error: 'No snapshot available for this view type' });
      }

      return reply.status(200).send(snapshot);
    }
  );

  fastify.get('/api/events/health', async (_request, reply) => {
    const result = loadConfig(findConfigPath());
    const eventsConfig = result.config?.providers?.events;
    if (!eventsConfig) {
      return reply.status(422).send({ error: 'Events provider not configured' });
    }

    const activeTypes = (result.config?.views ?? [])
      .map(v => v.type)
      .filter(t => ALLOWED_TYPES.includes(t as (typeof ALLOWED_TYPES)[number]));

    const viewTypes: RefreshStatus[] = activeTypes.map(viewType => {
      const snapshot = getSnapshot(eventsConfig.city, viewType);
      return {
        viewType,
        lastRefreshed: snapshot?.refreshedAt ?? null,
        stale: snapshot?.stale ?? true,
        eventCount: snapshot?.events.length ?? 0,
      };
    });

    return reply.status(200).send({
      city: eventsConfig.city,
      configuredCategories: eventsConfig.categories ?? [],
      viewTypes,
    });
  });
}
