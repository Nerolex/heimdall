import { describe, it, expect, vi, afterEach } from 'vitest';
import type { EventsProviderConfig } from '@heimdall/shared';

vi.mock('../src/services/events/rausgegangen.js', () => ({
  fetchCsrfCookie: vi.fn(),
}));
vi.mock('../src/services/events/paginateFetch.js', () => ({
  paginateFetch: vi.fn(),
}));
vi.mock('../src/services/events/snapshotStore.js', () => ({
  getSnapshot: vi.fn(),
  setSnapshot: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const mockConfig: EventsProviderConfig = {
  city: 'dortmund',
  lat: 51.5136,
  lng: 7.4653,
  categories: [],
};

describe('refreshSnapshot', () => {
  it('writes stale:false snapshot on success', async () => {
    const { fetchCsrfCookie } = await import('../src/services/events/rausgegangen.js');
    const { paginateFetch } = await import('../src/services/events/paginateFetch.js');
    const { setSnapshot } = await import('../src/services/events/snapshotStore.js');

    vi.mocked(fetchCsrfCookie).mockResolvedValue({ cookie: 'c', csrfToken: 'csrf' });
    vi.mocked(paginateFetch).mockResolvedValue([
      {
        id: '1',
        title: 'Event',
        categorySlug: 'party',
        date: new Date().toISOString().split('T')[0],
        description: 'Venue | 8pm',
        additionalInfos: null,
        slug: 'event',
      },
    ]);

    const { refreshSnapshot } = await import('../src/services/events/refreshDailySnapshot.js');
    await refreshSnapshot('events-today', mockConfig);

    expect(setSnapshot).toHaveBeenCalledWith(
      'dortmund',
      'events-today',
      expect.objectContaining({ stale: false })
    );
  });

  it('sets stale:true and preserves events when prior snapshot exists on error', async () => {
    const { fetchCsrfCookie } = await import('../src/services/events/rausgegangen.js');
    const { getSnapshot, setSnapshot } = await import('../src/services/events/snapshotStore.js');

    vi.mocked(fetchCsrfCookie).mockRejectedValue(new Error('Network error'));
    vi.mocked(getSnapshot).mockReturnValue({
      viewType: 'events-today',
      city: 'dortmund',
      events: [{ id: '1' } as never],
      totalFetched: 1,
      windowStart: '2024-05-15',
      windowEnd: '2024-05-15',
      refreshedAt: '2024-05-15T00:00:00Z',
      stale: false,
    });

    const { refreshSnapshot } = await import('../src/services/events/refreshDailySnapshot.js');
    await refreshSnapshot('events-today', mockConfig);

    expect(setSnapshot).toHaveBeenCalledWith(
      'dortmund',
      'events-today',
      expect.objectContaining({ stale: true, events: [{ id: '1' }] })
    );
  });

  it('writes error snapshot when no prior snapshot exists on error', async () => {
    const { fetchCsrfCookie } = await import('../src/services/events/rausgegangen.js');
    const { getSnapshot, setSnapshot } = await import('../src/services/events/snapshotStore.js');

    vi.mocked(fetchCsrfCookie).mockRejectedValue(new Error('Network error'));
    vi.mocked(getSnapshot).mockReturnValue(undefined);

    const { refreshSnapshot } = await import('../src/services/events/refreshDailySnapshot.js');
    await refreshSnapshot('events-today', mockConfig);

    expect(setSnapshot).toHaveBeenCalledWith(
      'dortmund',
      'events-today',
      expect.objectContaining({ stale: true, events: [], error: 'Network error' })
    );
  });

  it('bootstrapRefreshScheduler calls setInterval per view type', async () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const { fetchCsrfCookie } = await import('../src/services/events/rausgegangen.js');
    const { paginateFetch } = await import('../src/services/events/paginateFetch.js');
    vi.mocked(fetchCsrfCookie).mockResolvedValue({ cookie: 'c', csrfToken: 'csrf' });
    vi.mocked(paginateFetch).mockResolvedValue([]);

    const { bootstrapRefreshScheduler } = await import(
      '../src/services/events/refreshDailySnapshot.js'
    );
    bootstrapRefreshScheduler(mockConfig, ['events-today', 'events-weekend']);

    expect(setIntervalSpy).toHaveBeenCalledTimes(2);
  });
});
