import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { calendarRoute } from '../src/routes/calendar.js';

function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function makeIcsEvent(uid: string, title: string, start: Date, end: Date): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Heimdall Test//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${title}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

describe('POST /api/calendar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  async function buildApp() {
    const app = Fastify();
    await app.register(calendarRoute);
    return app;
  }

  it('returns 400 if sources are missing', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/calendar',
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('sources array required');
  });

  it('returns parsed events for valid ICS source', async () => {
    const now = new Date();
    const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const ics = makeIcsEvent('evt-1', 'Focus Time', start, end);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => ics,
    } as never);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/calendar',
      payload: {
        sources: [{ url: 'https://calendar.example.com/main.ics', name: 'Main', color: '#4a90d9' }],
        daysAhead: 3,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].title).toBe('Focus Time');
    expect(body.events[0].calendar).toBe('Main');
    expect(body.events[0].color).toBe('#4a90d9');
  });
});
