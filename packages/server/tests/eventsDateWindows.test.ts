import { describe, it, expect, vi, afterEach } from 'vitest';
import { getTodayWindow, getWeekendWindow, getUpcomingWindow } from '../src/services/events/dateWindows.js';

afterEach(() => {
  vi.useRealTimers();
});

function setFakeDate(isoStr: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(isoStr));
}

describe('getTodayWindow', () => {
  it('returns single-date pair', () => {
    setFakeDate('2024-05-15T10:00:00Z');
    const { windowStart, windowEnd } = getTodayWindow();
    expect(windowStart).toBe(windowEnd);
    expect(windowStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getWeekendWindow', () => {
  it('from Monday returns next Sat/Sun', () => {
    // 2024-05-13 is a Monday
    setFakeDate('2024-05-13T10:00:00Z');
    const { windowStart, windowEnd } = getWeekendWindow();
    expect(windowStart).toBe('2024-05-18');
    expect(windowEnd).toBe('2024-05-19');
  });

  it('from Saturday returns [today, tomorrow]', () => {
    // 2024-05-18 is a Saturday
    setFakeDate('2024-05-18T10:00:00Z');
    const { windowStart, windowEnd } = getWeekendWindow();
    expect(windowStart).toBe('2024-05-18');
    expect(windowEnd).toBe('2024-05-19');
  });

  it('from Sunday returns [today, today]', () => {
    // 2024-05-19 is a Sunday
    setFakeDate('2024-05-19T10:00:00Z');
    const { windowStart, windowEnd } = getWeekendWindow();
    expect(windowStart).toBe('2024-05-19');
    expect(windowEnd).toBe('2024-05-19');
  });
});

describe('getUpcomingWindow', () => {
  it('with days=1 returns single date', () => {
    setFakeDate('2024-05-15T10:00:00Z');
    const { windowStart, windowEnd } = getUpcomingWindow(1);
    expect(windowStart).toBe(windowEnd);
  });

  it('with days=7 returns 7-day span', () => {
    setFakeDate('2024-05-15T10:00:00Z');
    const { windowStart, windowEnd } = getUpcomingWindow(7);
    expect(windowStart).toBe('2024-05-15');
    expect(windowEnd).toBe('2024-05-21');
  });

  it('all dates formatted as YYYY-MM-DD', () => {
    setFakeDate('2024-01-01T10:00:00Z');
    const { windowStart, windowEnd } = getUpcomingWindow(7);
    expect(windowStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(windowEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
