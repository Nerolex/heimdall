import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import React from 'react';
import { App } from '../../src/App';

describe('App view cycling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('cycles through views at the configured interval', async () => {
    const config = {
      cycleInterval: 5,
      views: [
        { type: 'image', settings: { src: '/img1.png', displayMode: 'contain' } },
        { type: 'image', settings: { src: '/img2.png', displayMode: 'cover' } },
        { type: 'image', settings: { src: '/img3.png', displayMode: 'stretch' } },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(config),
    });

    await act(async () => {
      render(<App />);
    });

    // Should start with first image
    let img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/img1.png');

    // Advance 5 seconds — should show second view
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/img2.png');

    // Advance another 5 seconds — third view
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/img3.png');

    // Advance again — wraps to first
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/img1.png');
  });

  it('does not cycle with a single view', async () => {
    const config = {
      cycleInterval: 5,
      views: [
        { type: 'image', settings: { src: '/only.png', displayMode: 'contain' } },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(config),
    });

    await act(async () => {
      render(<App />);
    });

    let img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/only.png');

    // Advance time — should still show same view
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/only.png');
  });

  it('uses default 30s interval when cycleInterval is missing', async () => {
    const config = {
      views: [
        { type: 'image', settings: { src: '/a.png' } },
        { type: 'image', settings: { src: '/b.png' } },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(config),
    });

    await act(async () => {
      render(<App />);
    });

    let img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/a.png');

    // 29 seconds — should NOT have cycled yet
    await act(async () => {
      vi.advanceTimersByTime(29000);
    });
    img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/a.png');

    // 1 more second (total 30s) — should cycle
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/b.png');
  });

  it('treats invalid cycleInterval as 30s default', async () => {
    const config = {
      cycleInterval: -5,
      views: [
        { type: 'image', settings: { src: '/x.png' } },
        { type: 'image', settings: { src: '/y.png' } },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(config),
    });

    await act(async () => {
      render(<App />);
    });

    // At 29s, should still show first
    await act(async () => {
      vi.advanceTimersByTime(29000);
    });
    let img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/x.png');

    // At 30s, should cycle
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/y.png');
  });
});
