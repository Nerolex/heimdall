import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
import { PhotosMemoriesView } from '../../src/components/views/photos/PhotosMemoriesView';
import type { PhotoEntry } from '@heimdall/shared';

function makePhoto(id: string): PhotoEntry {
  return { id, url: `/photos/${id}.jpg`, filename: `${id}.jpg`, dateTaken: new Date('2021-06-15').toISOString() };
}

function makeMemoriesResponse(entries: Record<string, PhotoEntry[]>) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ memories: entries }),
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PhotosMemoriesView — fresh mount (no savedState)', () => {
  it('renders an empty container while loading (no visible text flash)', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const { container } = render(<PhotosMemoriesView settings={{}} />);
    // Loading state renders a blank container — no text — to prevent flash during fade-out
    expect(container.textContent).toBe('');
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('renders a memory photo after successful fetch', async () => {
    const photo = makePhoto('birthday-cake');
    global.fetch = makeMemoriesResponse({ '3 years ago': [photo] });

    const { container } = await act(async () => render(<PhotosMemoriesView settings={{}} />));

    const srcs = Array.from(container.querySelectorAll('img')).map(i => i.getAttribute('src'));
    expect(srcs.some(s => s?.includes('birthday-cake.jpg'))).toBe(true);
  });

  it('renders the memory label', async () => {
    const photo = makePhoto('park');
    global.fetch = makeMemoriesResponse({ '2 years ago': [photo] });

    const { container } = await act(async () => render(<PhotosMemoriesView settings={{}} />));

    expect(container.textContent).toContain('2 years ago');
  });

  it('calls __onStateChange with the selected memory', async () => {
    const photo = makePhoto('holiday');
    const onStateChange = vi.fn();
    global.fetch = makeMemoriesResponse({ 'Last year': [photo] });

    await act(async () =>
      render(<PhotosMemoriesView settings={{ __onStateChange: onStateChange }} />)
    );

    expect(onStateChange).toHaveBeenCalledOnce();
    const arg = onStateChange.mock.calls[0][0] as { label: string; photo: PhotoEntry };
    expect(arg.label).toBe('Last year');
    expect(arg.photo).toEqual(photo);
  });

  it('shows empty state when memories object has no entries', async () => {
    global.fetch = makeMemoriesResponse({});

    const { container } = await act(async () => render(<PhotosMemoriesView settings={{}} />));

    expect(container.textContent).toContain('Keine Erinnerungen');
  });

  it('shows error when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('timeout'));

    const { container } = await act(async () => render(<PhotosMemoriesView settings={{}} />));

    expect(container.textContent).toContain('Photos unavailable');
  });

  it('shows error when fetch returns non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const { container } = await act(async () => render(<PhotosMemoriesView settings={{}} />));

    expect(container.textContent).toContain('Photos unavailable');
  });

  it('appends dir query param when dir setting is provided', async () => {
    const fetchMock = makeMemoriesResponse({});
    global.fetch = fetchMock;

    await act(async () => render(<PhotosMemoriesView settings={{ dir: 'family' }} />));

    const calledUrl = (fetchMock.mock.calls[0] as [string])[0];
    expect(calledUrl).toContain('dir=family');
  });

  it('selects one photo when multiple memories exist', async () => {
    const photos = [makePhoto('a'), makePhoto('b'), makePhoto('c')];
    global.fetch = makeMemoriesResponse({
      '1 year ago': [photos[0]],
      '2 years ago': [photos[1]],
      '3 years ago': [photos[2]],
    });

    const { container } = await act(async () => render(<PhotosMemoriesView settings={{}} />));

    // Exactly one memory photo rendered (two <img> elements per photo: blur + main)
    const photoImgs = Array.from(container.querySelectorAll('img'));
    const matchedPhotos = new Set(
      photoImgs
        .map(img => img.getAttribute('src'))
        .filter(s => s?.startsWith('/photos/'))
        .map(s => s?.split('/').pop()?.split('.')[0])
    );
    expect(matchedPhotos.size).toBe(1); // only one memory selected
  });
});

describe('PhotosMemoriesView — back navigation (savedState provided)', () => {
  it('does NOT call fetch when savedState is provided', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const savedState = { label: '5 years ago', photo: makePhoto('wedding') };

    await act(async () =>
      render(<PhotosMemoriesView settings={{ __savedState: savedState }} />)
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders the saved photo immediately without loading flash', async () => {
    const savedState = { label: 'Long ago', photo: makePhoto('saved-trip') };
    global.fetch = vi.fn();

    const { container } = await act(async () =>
      render(<PhotosMemoriesView settings={{ __savedState: savedState }} />)
    );

    // Must NOT show loading state
    expect(container.textContent).not.toContain('Loading memories');
    // Must show the saved photo
    const srcs = Array.from(container.querySelectorAll('img')).map(i => i.getAttribute('src'));
    expect(srcs.some(s => s?.includes('saved-trip.jpg'))).toBe(true);
  });

  it('renders the saved label', async () => {
    const savedState = { label: '4 years ago', photo: makePhoto('camp') };
    global.fetch = vi.fn();

    const { container } = await act(async () =>
      render(<PhotosMemoriesView settings={{ __savedState: savedState }} />)
    );

    expect(container.textContent).toContain('4 years ago');
  });

  it('calls __onStateChange with the savedState', async () => {
    const savedState = { label: 'Yesteryear', photo: makePhoto('cabin') };
    const onStateChange = vi.fn();
    global.fetch = vi.fn();

    await act(async () =>
      render(<PhotosMemoriesView settings={{
        __savedState: savedState,
        __onStateChange: onStateChange,
      }} />)
    );

    expect(onStateChange).toHaveBeenCalledOnce();
    expect(onStateChange).toHaveBeenCalledWith(savedState);
  });
});
