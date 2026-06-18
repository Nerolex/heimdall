import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
import type { EventRecord, EventsViewSnapshot } from '@heimdall/shared';
import { EventsWeekendView } from '../../src/components/views/events/EventsWeekendView';
import { clearSnapshotCache } from '../../src/components/views/events/useEventsSnapshot';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  clearSnapshotCache();
});

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'weekend-1',
    title: 'Weekend Concert',
    categorySlug: 'concerts-and-music',
    categoryLabel: 'Konzerte & Musik',
    date: '2024-05-18',
    dateDisplay: 'Sa., 18. Mai',
    venue: 'Club Stage',
    startTime: '20:00',
    venueAndTime: 'Club Stage · 20:00 Uhr',
    rawDescription: 'Club Stage | 2024-05-18 20:00',
    recurrenceNote: null,
    detailUrl: 'https://rausgegangen.de/en/dortmund/weekend-concert',
    city: 'dortmund',
    imageUrl: 'https://example.com/weekend.jpg',
    ...overrides,
  };
}

const readySnapshot: EventsViewSnapshot = {
  viewType: 'events-weekend',
  city: 'dortmund',
  events: [makeEvent()],
  totalFetched: 1,
  windowStart: '2024-05-18',
  windowEnd: '2024-05-19',
  refreshedAt: '2024-05-15T00:00:00Z',
  stale: false,
};

describe('EventsWeekendView', () => {
  it('renders grouped weekend events when data is available', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(readySnapshot),
    });

    const { container } = await act(async () => render(<EventsWeekendView settings={{}} />));

    expect(container.textContent).toContain('Weekend Concert');
    expect(container.textContent).toContain('Sa., 18. Mai');
  });

  it('shows gradient fallback when no weekend events are available', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...readySnapshot, events: [] }),
    });

    const { container } = await act(async () => render(<EventsWeekendView settings={{}} />));

    expect(container.firstChild).not.toBeNull();
    expect(container.querySelector('[class*="groupedContainer"]')).not.toBeNull();
    expect(container.querySelector('[class*="showcaseFallback"]')).not.toBeNull();
  });

  it('calls __onEmpty when no weekend events are available and skipIfEmpty is enabled', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...readySnapshot, events: [] }),
    });

    const onEmpty = vi.fn();

    await act(async () =>
      render(<EventsWeekendView settings={{ skipIfEmpty: true, __onEmpty: onEmpty }} />)
    );

    expect(onEmpty).toHaveBeenCalledOnce();
  });
});
