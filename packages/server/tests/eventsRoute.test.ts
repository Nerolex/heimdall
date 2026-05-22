import { describe, it, expect, vi, afterEach } from 'vitest';
import Fastify from 'fastify';
import type { EventsViewSnapshot } from '@heimdall/shared';

vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn(),
}));
vi.mock('../src/services/events/snapshotStore.js', () => ({
  getSnapshot: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

async function buildApp() {
  const { eventsRoute } = await import('../src/routes/events.js');
  const app = Fastify();
  await app.register(eventsRoute);
  return app;
}

const mockConfig = {
  config: {
    views: [{ type: 'events-today' }],
    providers: {
      events: { city: 'dortmund', lat: 51.5, lng: 7.4, categories: [] },
    },
  },
};

const mockSnapshot: EventsViewSnapshot = {
  viewType: 'events-today',
  city: 'dortmund',
  events: [],
  totalFetched: 0,
  windowStart: '2024-05-15',
  windowEnd: '2024-05-15',
  refreshedAt: '2024-05-15T00:00:00Z',
  stale: false,
};

describe('GET /api/events/snapshot', () => {
  it('returns 200 with snapshot when available', async () => {
    const { loadConfig } = await import('../src/config.js');
    const { getSnapshot } = await import('../src/services/events/snapshotStore.js');
    vi.mocked(loadConfig).mockReturnValue(mockConfig as never);
    vi.mocked(getSnapshot).mockReturnValue(mockSnapshot);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/events/snapshot?type=events-today' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.viewType).toBe('events-today');
  });

  it('returns 404 when no snapshot exists', async () => {
    const { loadConfig } = await import('../src/config.js');
    const { getSnapshot } = await import('../src/services/events/snapshotStore.js');
    vi.mocked(loadConfig).mockReturnValue(mockConfig as never);
    vi.mocked(getSnapshot).mockReturnValue(undefined);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/events/snapshot?type=events-today' });
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 for invalid type', async () => {
    const { loadConfig } = await import('../src/config.js');
    vi.mocked(loadConfig).mockReturnValue(mockConfig as never);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/events/snapshot?type=invalid' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 422 when provider config is absent', async () => {
    const { loadConfig } = await import('../src/config.js');
    vi.mocked(loadConfig).mockReturnValue({
      config: { views: [], providers: undefined },
    } as never);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/events/snapshot?type=events-today' });
    expect(res.statusCode).toBe(422);
  });
});

describe('GET /api/events/health', () => {
  it('returns 200 with viewTypes array', async () => {
    const { loadConfig } = await import('../src/config.js');
    const { getSnapshot } = await import('../src/services/events/snapshotStore.js');
    vi.mocked(loadConfig).mockReturnValue(mockConfig as never);
    vi.mocked(getSnapshot).mockReturnValue(mockSnapshot);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/events/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.viewTypes).toBeDefined();
    expect(Array.isArray(body.viewTypes)).toBe(true);
  });
});
