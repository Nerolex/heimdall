import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
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
import { bootstrapRefreshScheduler } from './services/events/refreshDailySnapshot.js';
import { loadFromDisk } from './services/events/snapshotStore.js';
import { loadConfig } from './config.js';

const server = Fastify({ logger: true });

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

/** Walk up from cwd to find the monorepo root (has pnpm-workspace.yaml). */
function findProjectRoot(): string {
  let dir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();

async function start(): Promise<void> {
  // Register config API route
  await server.register(configRoute);
  await server.register(calendarRoute);
  await server.register(photosRoute);
  await server.register(retroAchievementsRoute);
  await server.register(steamGridDBRoute);
  await server.register(igdbRoute);
  await server.register(lastfmRoute);
  await server.register(steamRoute);
  await server.register(gamingRoute);
  await server.register(plexRoute);
  await server.register(youtubeRoute);

  // Load snapshot store from disk
  await loadFromDisk(path.resolve(PROJECT_ROOT, 'data/events-snapshots.json'));

  // Bootstrap events provider if configured
  const configResult = loadConfig(path.resolve(PROJECT_ROOT, 'config.json'));
  const eventsConfig = configResult.config?.providers?.events;
  if (eventsConfig) {
    const activeViewTypes = (configResult.config?.views ?? [])
      .map(v => v.type)
      .filter(t => ['events-today', 'events-weekend', 'events-upcoming'].includes(t));
    const upcomingSettings = configResult.config?.views?.find(
      v => v.type === 'events-upcoming'
    )?.settings;
    const days = typeof upcomingSettings?.days === 'number' ? upcomingSettings.days : 7;
    bootstrapRefreshScheduler(eventsConfig, activeViewTypes, days);
  }
  await server.register(eventsRoute);

  // Serve static assets from assets/ directory
  const assetsDir = path.resolve(PROJECT_ROOT, 'assets');
  if (fs.existsSync(assetsDir)) {
    await server.register(fastifyStatic, {
      root: assetsDir,
      prefix: '/assets/',
    });
  }

  // Serve dashboard build (production)
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const dashboardDir = path.resolve(currentDir, '../../dashboard/dist');
  if (fs.existsSync(dashboardDir)) {
    await server.register(fastifyStatic, {
      root: dashboardDir,
      prefix: '/',
      decorateReply: false,
      wildcard: false,
    });

    // SPA fallback — serve index.html for non-API routes
    server.setNotFoundHandler(async (_request, reply) => {
      const indexPath = path.join(dashboardDir, 'index.html');
      const content = fs.readFileSync(indexPath, 'utf-8');
      return reply.type('text/html').send(content);
    });
  }

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
