import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
import { EventCard } from '../../src/components/views/events/EventCard';
import { EventsTodayView } from '../../src/components/views/events/EventsTodayView';
import type { EventRecord, EventsViewSnapshot } from '@heimdall/shared';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

describe('EventCard', () => {
  it('renders title, categoryLabel, dateDisplay, venueAndTime', () => {
    const { container } = render(<EventCard event={makeEvent()} />);
    expect(container.textContent).toContain('Test Concert');
    expect(container.textContent).toContain('Concerts And Music');
    expect(container.textContent).toContain('Wed, 15 May');
    expect(container.textContent).toContain('Club Stage | 8:00 PM');
  });

  it('falls back to rawDescription when venueAndTime is null', () => {
    const event = makeEvent({ venueAndTime: null, rawDescription: 'Raw description text' });
    const { container } = render(<EventCard event={event} />);
    expect(container.textContent).toContain('Raw description text');
  });

  it('omits recurrenceNote when null', () => {
    const { container } = render(<EventCard event={makeEvent({ recurrenceNote: null })} />);
    expect(container.querySelector('[class*="recurrenceNote"]')).toBeNull();
  });

  it('renders recurrenceNote when non-null', () => {
    const { container } = render(<EventCard event={makeEvent({ recurrenceNote: 'Every Friday' })} />);
    expect(container.textContent).toContain('Every Friday');
  });
});

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

  it('renders stale banner when snapshot is stale', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...mockSnapshot, stale: true }),
    });
    const { container } = await act(async () => render(<EventsTodayView settings={{}} />));
    expect(container.textContent).toContain('Showing cached data');
  });

  it('renders empty state on empty status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...mockSnapshot, events: [] }),
    });
    const { container } = await act(async () => render(<EventsTodayView settings={{}} />));
    expect(container.textContent).toContain('No events today');
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

  it('renders error state on error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
    const { container } = await act(async () => render(<EventsTodayView settings={{}} />));
    expect(container.textContent).toContain('Could not load events');
  });
});
