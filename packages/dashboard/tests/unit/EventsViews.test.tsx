import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
import { EventsTodayView } from '../../src/components/views/events/EventsTodayView';
import { clearSnapshotCache } from '../../src/hooks/useViewSnapshot';
import type { EventRecord, EventsViewSnapshot } from '@heimdall/shared';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  clearSnapshotCache();
});

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: '1',
    title: 'Test Concert',
    categorySlug: 'concerts-and-music',
    categoryLabel: 'Konzerte & Musik',
    date: '2024-05-15',
    dateDisplay: 'Mi., 15. Mai',
    venue: 'Club Stage',
    startTime: '20:00',
    venueAndTime: 'Club Stage · 20:00 Uhr',
    rawDescription: 'Club Stage | 2024-05-15 20:00',
    recurrenceNote: null,
    detailUrl: 'https://rausgegangen.de/en/dortmund/test-concert',
    city: 'dortmund',
    ...overrides,
  };
}

const mockSnapshot: EventsViewSnapshot = {
  viewType: 'events-today',
  city: 'dortmund',
  events: [makeEvent()],
  totalFetched: 1,
  windowStart: '2024-05-15',
  windowEnd: '2024-05-15',
  refreshedAt: '2024-05-15T00:00:00Z',
  stale: false,
};

describe('EventsTodayView', () => {
  it('renders card list on ready status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockSnapshot),
    });
    const { container } = await act(async () => render(<EventsTodayView settings={{}} />));
    expect(container.textContent).toContain('Test Concert');
  });

  it('still renders the event when snapshot is stale', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...mockSnapshot, stale: true }),
    });
    const { container } = await act(async () => render(<EventsTodayView settings={{}} />));
    expect(container.textContent).toContain('Test Concert');
    expect(container.textContent).not.toContain('Showing cached data');
  });

  it('shows gradient fallback on empty status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...mockSnapshot, events: [] }),
    });
    const { container } = await act(async () => render(<EventsTodayView settings={{}} />));
    expect(container.firstChild).not.toBeNull();
    const showcaseContainer = container.querySelector('[class*="showcaseContainer"]');
    expect(showcaseContainer).not.toBeNull();
    expect(container.querySelector('[class*="showcaseFallback"]')).not.toBeNull();
  });

  it('calls __onEmpty when empty and skipIfEmpty is true', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...mockSnapshot, events: [] }),
    });
    const onEmpty = vi.fn();
    await act(async () =>
      render(<EventsTodayView settings={{ skipIfEmpty: true, __onEmpty: onEmpty }} />)
    );
    expect(onEmpty).toHaveBeenCalledOnce();
  });

  it('shows gradient fallback on error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
    const { container } = await act(async () => render(<EventsTodayView settings={{}} />));
    expect(container.firstChild).not.toBeNull();
    expect(container.querySelector('[class*="showcaseFallback"]')).not.toBeNull();
  });
});
