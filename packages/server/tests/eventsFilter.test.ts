import { describe, it, expect } from 'vitest';
import { filterByWindow, filterByCategory } from '../src/services/events/filterEvents.js';
import type { RawEventRecord } from '@heimdall/shared';

function makeEvent(overrides: Partial<RawEventRecord> = {}): RawEventRecord {
  return {
    id: '1',
    title: 'Test Event',
    categorySlug: 'concerts-and-music',
    date: '2024-05-15',
    description: 'Test description',
    additionalInfos: null,
    slug: 'test-event',
    ...overrides,
  };
}

describe('filterByWindow', () => {
  it('discards events outside range', () => {
    const events = [
      makeEvent({ date: '2024-05-14' }),
      makeEvent({ date: '2024-05-15' }),
      makeEvent({ date: '2024-05-16' }),
      makeEvent({ date: '2024-05-17' }),
    ];
    const result = filterByWindow(events, '2024-05-15', '2024-05-16');
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2024-05-15');
    expect(result[1].date).toBe('2024-05-16');
  });

  it('sorts output ascending by date', () => {
    const events = [
      makeEvent({ date: '2024-05-16' }),
      makeEvent({ date: '2024-05-15' }),
    ];
    const result = filterByWindow(events, '2024-05-14', '2024-05-17');
    expect(result[0].date).toBe('2024-05-15');
    expect(result[1].date).toBe('2024-05-16');
  });
});

describe('filterByCategory', () => {
  it('empty whitelist keeps all except available-anytime', () => {
    const events = [
      makeEvent({ categorySlug: 'concerts-and-music' }),
      makeEvent({ categorySlug: 'available-anytime' }),
      makeEvent({ categorySlug: 'party' }),
    ];
    const result = filterByCategory(events, []);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.categorySlug !== 'available-anytime')).toBe(true);
  });

  it('populated whitelist removes non-matching slugs', () => {
    const events = [
      makeEvent({ categorySlug: 'concerts-and-music' }),
      makeEvent({ categorySlug: 'party' }),
      makeEvent({ categorySlug: 'theater' }),
    ];
    const result = filterByCategory(events, ['party']);
    expect(result).toHaveLength(1);
    expect(result[0].categorySlug).toBe('party');
  });

  it('always excludes available-anytime unless explicitly listed', () => {
    const events = [
      makeEvent({ categorySlug: 'available-anytime' }),
      makeEvent({ categorySlug: 'party' }),
    ];
    const result = filterByCategory(events, ['party']);
    expect(result).toHaveLength(1);
    expect(result.find(e => e.categorySlug === 'available-anytime')).toBeUndefined();
  });

  it('category comparison is case-insensitive', () => {
    const events = [
      makeEvent({ categorySlug: 'Concerts-And-Music' }),
    ];
    const result = filterByCategory(events, ['concerts-and-music']);
    expect(result).toHaveLength(1);
  });

  it('output is sorted ascending by date', () => {
    const events = [
      makeEvent({ categorySlug: 'party', date: '2024-05-17' }),
      makeEvent({ categorySlug: 'party', date: '2024-05-15' }),
    ];
    const result = filterByCategory(events, ['party']);
    expect(result[0].date).toBe('2024-05-15');
  });
});
