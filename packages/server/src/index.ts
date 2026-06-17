import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { configRoute } from './routes/config.js';
import { calendarRoute } from './routes/calendar.js';
import { photosRoute } from './routes/photos.js';
import { retroAchievementsRoute } from './routes/retroachievements.js';
import { steamGridDBRoute } from './routes/steamgriddb.js';
import { igdbRoute } from './routes/igdb.js';
import { lastfmRoute } from './routes/lastfm.js';
import { steamRoute } from './routes/steam.js';
import { gamingRoute } from './routes/gaming.js';
import { plexRoute } from './routes/plex.js';
import { youtubeRoute } from './routes/youtube.js';
import { eventsRoute } from './routes/events.js';
import { concertsRoute } from './routes/concerts.js';
import { bootstrapRefreshScheduler } from './services/events/refreshDailySnapshot.js';
import { loadFromDisk, persistToDisk } from './services/events/snapshotStore.js';
import { loadSnapshotFromDisk as loadConcertsSnapshot } from './services/concerts/snapshotStore.js';
import { startConcertsRefreshScheduler } from './services/concerts/refreshSnapshot.js';
import { loadConfig } from './config.js';
import { findProjectRoot, resolveConfigPath } from './utils/projectRoot.js';

const server = Fastify({ logger: true });

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const PROJECT_ROOT = findProjectRoot();

async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(configRoute);
  await app.register(calendarRoute);
  await app.register(photosRoute);
  await app.register(retroAchievementsRoute);
  await app.register(steamGridDBRoute);
  await app.register(igdbRoute);
  await app.register(lastfmRoute);
  await app.register(steamRoute);
  await app.register(gamingRoute);
  await app.register(plexRoute);
  await app.register(youtubeRoute);
}

async function bootstrapEventsService(app: FastifyInstance, projectRoot: string): Promise<void> {
  const persistPath = path.resolve(projectRoot, 'data/events-snapshots.json');
  await loadFromDisk(persistPath);
  // Persist snapshots to disk every hour so restarts can recover from the last good state
  setInterval(() => void persistToDisk(persistPath), 60 * 60 * 1000);

  // Use resolveConfigPath() so HEIMDALL_CONFIG env var is honoured here too
  const configResult = loadConfig(resolveConfigPath());
  const eventsConfig = configResult.config?.providers?.events;
  if (eventsConfig) {
    // Derive view types to refresh from the actual config — no point scraping data nobody displays
    const EVENT_VIEW_TYPES = new Set(['events-today', 'events-weekend', 'events-upcoming']);
    const configuredViews = configResult.config?.views ?? [];
    const viewTypesToRefresh = [
      ...new Set(configuredViews.map(v => v.type).filter(t => EVENT_VIEW_TYPES.has(t))),
    ];

    // A1: Multiple events-upcoming views share a single snapshot keyed by view type.
    // Warn operators so they're aware all copies will display identical content.
    const upcomingCount = configuredViews.filter(v => v.type === 'events-upcoming').length;
    if (upcomingCount > 1) {
      server.log.warn(
        `${upcomingCount} events-upcoming views are configured, but only one day-window snapshot is ` +
        `maintained. All events-upcoming views will display identical content. ` +
        `To show different cities or time windows, use separate view types or separate server instances.`,
      );
    }

    const upcomingSettings = configuredViews.find(v => v.type === 'events-upcoming')?.settings;
    const days = typeof upcomingSettings?.days === 'number' ? upcomingSettings.days : 7;
    if (viewTypesToRefresh.length > 0) {
      bootstrapRefreshScheduler(eventsConfig, viewTypesToRefresh, days);
    }
  }

  await app.register(eventsRoute);
}

async function bootstrapConcertsService(app: FastifyInstance): Promise<void> {
  loadConcertsSnapshot();

  const configResult = loadConfig(resolveConfigPath());
  const concertsConfig = configResult.config?.providers?.concerts;
  const plexConfig = configResult.config?.plex;
  
  // Load raw config to get lat/lng from events provider
  let eventsLatLng: { lat?: number; lng?: number } | undefined;
  try {
    const rawConfig = JSON.parse(fs.readFileSync(resolveConfigPath(), 'utf-8'));
    const eventsRaw = rawConfig?.providers?.events;
    if (eventsRaw && typeof eventsRaw.lat === 'number' && typeof eventsRaw.lng === 'number') {
      eventsLatLng = { lat: eventsRaw.lat, lng: eventsRaw.lng };
    }
  } catch (err) {
    // Ignore - lat/lng are optional fallbacks
  }

  if (concertsConfig && concertsConfig.apiKey) {
    startConcertsRefreshScheduler({
      concerts: concertsConfig,
      plex: plexConfig,
      events: eventsLatLng,
    });
  } else {
    server.log.info('[concerts] Concerts provider not configured or missing API key');
  }

  await app.register(concertsRoute);
}

async function registerStaticFiles(app: FastifyInstance, projectRoot: string, currentDir: string): Promise<void> {
  const assetsDir = path.resolve(projectRoot, 'assets');
  if (fs.existsSync(assetsDir)) {
    await app.register(fastifyStatic, {
      root: assetsDir,
      prefix: '/assets/',
    });
  }

  const dashboardDir = path.resolve(currentDir, '../../dashboard/dist');
  if (fs.existsSync(dashboardDir)) {
    await app.register(fastifyStatic, {
      root: dashboardDir,
      prefix: '/',
      decorateReply: false,
      wildcard: false,
    });

    // SPA fallback — serve index.html for non-API GET requests only.
    // API routes that don't exist should return a proper JSON 404, not HTML.
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.code(404).send({ error: 'API endpoint not found' });
      }
      const content = fs.readFileSync(path.join(dashboardDir, 'index.html'), 'utf-8');
      return reply.type('text/html').send(content);
    });
  }
}

async function start(): Promise<void> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  await registerRoutes(server);
  await bootstrapEventsService(server, PROJECT_ROOT);
  await bootstrapConcertsService(server);
  await registerStaticFiles(server, PROJECT_ROOT, currentDir);

  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Heimdall server listening on ${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();

export { server };
