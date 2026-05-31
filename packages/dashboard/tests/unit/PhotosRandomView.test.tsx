import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
import { PhotosRandomView } from '../../src/components/views/photos/PhotosRandomView';

// Helper: build a minimal PhotoEntry
function makePhoto(id: string) {
  return { url: `/photos/${id}.jpg`, filename: `${id}.jpg`, dateTaken: new Date('2022-06-15').getTime() };
}

function mockFetchPhoto(photo: ReturnType<typeof makePhoto>) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ photo }),
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PhotosRandomView — fresh mount (no savedState)', () => {
  it('renders an empty container while loading (no visible text flash)', () => {
    // fetch that never resolves → component stays in loading state
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const { container } = render(<PhotosRandomView settings={{}} />);
    // Loading state renders a blank container — no text — to prevent flash during fade-out
    expect(container.textContent).toBe('');
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('fetches a random photo and renders it', async () => {
    const photo = makePhoto('beach');
    global.fetch = mockFetchPhoto(photo);

    const { container } = await act(async () => render(<PhotosRandomView settings={{}} />));

    const srcs = Array.from(container.querySelectorAll('img')).map(i => i.getAttribute('src'));
    expect(srcs.some(s => s?.includes('beach.jpg'))).toBe(true);
  });

  it('calls __onStateChange with the fetched photo', async () => {
    const photo = makePhoto('mountain');
    global.fetch = mockFetchPhoto(photo);
    const onStateChange = vi.fn();

    await act(async () => render(<PhotosRandomView settings={{ __onStateChange: onStateChange }} />));

    expect(onStateChange).toHaveBeenCalledOnce();
    expect(onStateChange).toHaveBeenCalledWith({ __view: 'photos-random', photo });
  });

  it('shows error text when the API fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const { container } = await act(async () => render(<PhotosRandomView settings={{}} />));

    expect(container.textContent).toContain('Photos unavailable');
  });

  it('shows "No photos found" when API returns empty photo', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ photo: null }),
    });

    const { container } = await act(async () => render(<PhotosRandomView settings={{}} />));

    expect(container.textContent).toContain('No photos found');
  });

  it('shows error when fetch returns non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const { container } = await act(async () => render(<PhotosRandomView settings={{}} />));

    expect(container.textContent).toContain('Photos unavailable');
  });

  it('appends dir query param to the fetch URL when dir setting is provided', async () => {
    const photo = makePhoto('forest');
    const fetchMock = mockFetchPhoto(photo);
    global.fetch = fetchMock;

    await act(async () => render(<PhotosRandomView settings={{ dir: 'holidays' }} />));

    const calledUrl = (fetchMock.mock.calls[0] as [string])[0];
    expect(calledUrl).toContain('dir=holidays');
  });
});

describe('PhotosRandomView — back navigation (savedState provided)', () => {
  it('does NOT call fetch when savedState has a photo', async () => {
    const savedPhoto = makePhoto('saved-sunset');
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    await act(async () =>
      render(<PhotosRandomView settings={{ __savedState: { __view: 'photos-random', photo: savedPhoto } }} />)
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders the saved photo immediately', async () => {
    const savedPhoto = makePhoto('saved-lake');
    global.fetch = vi.fn();

    const { container } = await act(async () =>
      render(<PhotosRandomView settings={{ __savedState: { __view: 'photos-random', photo: savedPhoto } }} />)
    );

    const srcs = Array.from(container.querySelectorAll('img')).map(i => i.getAttribute('src'));
    expect(srcs.some(s => s?.includes('saved-lake.jpg'))).toBe(true);
  });

  it('calls __onStateChange with the restored photo', async () => {
    const savedPhoto = makePhoto('saved-peak');
    const onStateChange = vi.fn();
    global.fetch = vi.fn();

    await act(async () =>
      render(<PhotosRandomView settings={{
        __savedState: { __view: 'photos-random', photo: savedPhoto },
        __onStateChange: onStateChange,
      }} />)
    );

    expect(onStateChange).toHaveBeenCalledOnce();
    expect(onStateChange).toHaveBeenCalledWith({ __view: 'photos-random', photo: savedPhoto });
  });

  it('ignores savedState if it has no __view: photos-random tag', async () => {
    const photo = makePhoto('fresh');
    global.fetch = mockFetchPhoto(photo);
    const onStateChange = vi.fn();

    // savedState is malformed — should fall back to fetch
    await act(async () =>
      render(<PhotosRandomView settings={{
        __savedState: { someOtherField: 'x' },
        __onStateChange: onStateChange,
      }} />)
    );

    expect(global.fetch).toHaveBeenCalled();
    expect(onStateChange).toHaveBeenCalledWith({ __view: 'photos-random', photo });
  });
});
