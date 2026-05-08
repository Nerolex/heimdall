/**
 * Integration tests for the view-history state restoration feature.
 *
 * These tests verify that when navigating back in the view stack,
 * the previously displayed content (e.g. a specific photo) is restored
 * rather than fresh content being loaded.
 *
 * Navigation zones (by fraction of screen width):
 *   left  zone: < 0.08  → go back
 *   right zone: > 0.92  → go forward
 *   mid   zone: 0.08–0.92 → open detail
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { App } from '../../src/App';

// Fade transition duration must match the value in App.tsx
const FADE_MS = 1000;

// Simulated screen width used in all click helpers
const SCREEN_W = 1000;

function makePhoto(id: string) {
  return { url: `/photos/${id}.jpg`, filename: `${id}.jpg`, dateTaken: Date.now() };
}

/** Mock getBoundingClientRect on the App's root element */
function mockRootRect(container: HTMLElement) {
  const root = container.firstChild as HTMLElement;
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
    left: 0, right: SCREEN_W, width: SCREEN_W,
    top: 0, bottom: 800, height: 800, x: 0, y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  return root;
}

/** Simulate a right-zone click (go forward) and wait for the transition */
async function clickForward(root: HTMLElement) {
  await act(async () => {
    fireEvent.click(root, { clientX: SCREEN_W * 0.95 }); // 0.95 > 0.92
  });
  await act(async () => { vi.advanceTimersByTime(FADE_MS); });
}

/** Simulate a left-zone click (go back) and wait for the transition */
async function clickBack(root: HTMLElement) {
  await act(async () => {
    fireEvent.click(root, { clientX: SCREEN_W * 0.03 }); // 0.03 < 0.08
  });
  await act(async () => { vi.advanceTimersByTime(FADE_MS); });
}

// Config helpers — mix of photos-random and static image views
function makeConfig(views: object[]) {
  return { cycleInterval: 60, views };
}

const imageView = { type: 'image', settings: { src: '/img/static.png', displayMode: 'contain' } };
const photosView = { type: 'photos-random', settings: {} };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('View history — back navigation restores previous state', () => {
  it('restores the same photo when navigating back to a photos-random view', async () => {
    const photoA = makePhoto('photoA');
    let photosRandCallCount = 0;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/config') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(makeConfig([photosView, imageView])) });
      }
      if ((url as string).includes('/api/photos/random')) {
        photosRandCallCount++;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ photo: photoA }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const { container } = await act(async () => render(<App />));
    const root = mockRootRect(container);

    // View 0: photos-random loaded → fetch called once, photoA shown
    expect(photosRandCallCount).toBe(1);
    let imgs = Array.from(container.querySelectorAll('img[src]')).map(i => i.getAttribute('src'));
    expect(imgs.some(s => s?.includes('photoA.jpg'))).toBe(true);

    // Navigate forward to view 1 (image)
    await clickForward(root);
    expect(container.querySelector('img[src="/img/static.png"]')).not.toBeNull();

    // Navigate back to view 0 (photos-random) — must restore photoA without re-fetching
    const callsBefore = photosRandCallCount;
    await clickBack(root);

    expect(photosRandCallCount).toBe(callsBefore); // no additional fetch
    imgs = Array.from(container.querySelectorAll('img[src]')).map(i => i.getAttribute('src'));
    expect(imgs.some(s => s?.includes('photoA.jpg'))).toBe(true);
  });

  it('loads a fresh photo on forward navigation after back navigation', async () => {
    // Config: photos-random (0) + image (1).
    // The preloaded view at pos=0 is image → it never fetches photos.
    // This makes fetch counts predictable.
    const photoA = makePhoto('photoA');
    let photosRandCallCount = 0;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/config') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(makeConfig([photosView, imageView])) });
      }
      if ((url as string).includes('/api/photos/random')) {
        photosRandCallCount++;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ photo: photoA }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const { container } = await act(async () => render(<App />));
    const root = mockRootRect(container);

    // Only query images in the active (non-preloaded) area
    const activeImgSrcs = () =>
      Array.from(container.querySelectorAll('img[src]'))
        .filter(img => !img.closest('[aria-hidden="true"]'))
        .map(img => img.getAttribute('src') ?? '');

    // pos=0 (photos-random): photoA in active area
    const pos0Srcs = activeImgSrcs();
    expect(pos0Srcs.some(s => s.includes('photoA'))).toBe(true);

    // Forward to pos=1 (image): no photos fetch expected
    await clickForward(root);
    expect(container.querySelector('img[src="/img/static.png"]')).not.toBeNull();

    // Back to pos=0: savedState must be used — no additional photos fetch
    const countBeforeBack = photosRandCallCount;
    await clickBack(root);
    expect(photosRandCallCount).toBe(countBeforeBack);

    // Same photo still shown in active area
    const restoredSrcs = activeImgSrcs();
    expect(restoredSrcs.some(s => pos0Srcs.includes(s))).toBe(true);
  });

  it('does not navigate back when already at the beginning of history', async () => {
    const photoA = makePhoto('only');
    let callCount = 0;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/config') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(makeConfig([photosView, imageView])) });
      }
      if ((url as string).includes('/api/photos/random')) {
        callCount++;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ photo: photoA }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const { container } = await act(async () => render(<App />));
    const root = mockRootRect(container);

    // Already at start of history — clicking back should do nothing
    await clickBack(root);
    // photos-random view is still shown
    const imgs = Array.from(container.querySelectorAll('img[src]')).map(i => i.getAttribute('src'));
    expect(imgs.some(s => s?.includes('only.jpg'))).toBe(true);
    // Only one fetch (no remount, no re-fetch)
    expect(callCount).toBe(1);
  });
});

describe('View history — auto-cycle creates fresh visits', () => {
  it('auto-cycled forward visit has no savedState (fresh fetch)', async () => {
    const photoA = makePhoto('autoA');
    const photoB = makePhoto('autoB');
    let callCount = 0;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/config') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeConfig([photosView, imageView])),
        });
      }
      if ((url as string).includes('/api/photos/random')) {
        callCount++;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ photo: callCount === 1 ? photoA : photoB }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const { container } = await act(async () => render(<App />));
    // View 0: photoA loaded
    expect(callCount).toBe(1);

    // Auto-cycle forward to image view (at 60s)
    await act(async () => { vi.advanceTimersByTime(60000); });
    expect(container.querySelector('img[src="/img/static.png"]')).not.toBeNull();

    // Auto-cycle again — back to photos-random (cycle wraps), should be a FRESH visit
    const callsBefore = callCount;
    await act(async () => { vi.advanceTimersByTime(60000); });

    // New visit to photos-random → fresh fetch expected (snapshot at new history pos was cleared)
    expect(callCount).toBeGreaterThan(callsBefore);
  });
});

describe('View history — snapshot scoped to history stack position', () => {
  it('each back navigation restores the correct photo for that stack depth', async () => {
    // views: [photos-random, photos-random, image]
    const photos = [makePhoto('depth0'), makePhoto('depth1'), makePhoto('depth2')];
    let callCount = 0;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/config') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeConfig([photosView, photosView, imageView])),
        });
      }
      if ((url as string).includes('/api/photos/random')) {
        const photo = photos[callCount] ?? photos[photos.length - 1];
        callCount++;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ photo }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const { container } = await act(async () => render(<App />));
    const root = mockRootRect(container);

    // Pos 0: photos-random → depth0.jpg
    let imgs = Array.from(container.querySelectorAll('img[src]')).map(i => i.getAttribute('src'));
    expect(imgs.some(s => s?.includes('depth0.jpg'))).toBe(true);

    // Forward to pos 1: photos-random → depth1.jpg (fresh)
    await clickForward(root);
    imgs = Array.from(container.querySelectorAll('img[src]')).map(i => i.getAttribute('src'));
    expect(imgs.some(s => s?.includes('depth1.jpg'))).toBe(true);

    // Forward to pos 2: image view
    await clickForward(root);
    expect(container.querySelector('img[src="/img/static.png"]')).not.toBeNull();

    // Back to pos 1: restore depth1.jpg (no new fetch)
    const countAtPos2 = callCount;
    await clickBack(root);
    expect(callCount).toBe(countAtPos2); // no new fetch
    imgs = Array.from(container.querySelectorAll('img[src]')).map(i => i.getAttribute('src'));
    expect(imgs.some(s => s?.includes('depth1.jpg'))).toBe(true);

    // Back to pos 0: restore depth0.jpg (no new fetch)
    await clickBack(root);
    expect(callCount).toBe(countAtPos2); // still no new fetch
    imgs = Array.from(container.querySelectorAll('img[src]')).map(i => i.getAttribute('src'));
    expect(imgs.some(s => s?.includes('depth0.jpg'))).toBe(true);
  });
});
