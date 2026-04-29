import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { configRoute } from '../src/routes/config.js';
import * as configModule from '../src/config.js';

vi.mock('../src/config.js');

describe('GET /api/config', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  async function buildApp() {
    const app = Fastify();
    await app.register(configRoute);
    return app;
  }

  it('returns 200 with valid config', async () => {
    vi.mocked(configModule.loadConfig).mockReturnValue({
      config: {
        cycleInterval: 10,
        views: [{ type: 'image', settings: { src: '/assets/test.png' } }],
      },
    });

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/config' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.views).toHaveLength(1);
    expect(body.cycleInterval).toBe(10);
  });

  it('returns 404 when config file not found', async () => {
    vi.mocked(configModule.loadConfig).mockReturnValue({
      error: 'config_not_found',
      message: 'No configuration file found. Create config.json in the project root.',
    });

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/config' });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('config_not_found');
  });

  it('returns 422 when config is invalid', async () => {
    vi.mocked(configModule.loadConfig).mockReturnValue({
      error: 'config_invalid',
      message: 'Configuration file could not be parsed: Unexpected token',
    });

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/config' });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('config_invalid');
  });
});
