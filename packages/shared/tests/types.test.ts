import { describe, it, expect } from 'vitest';
import {
  isValidDisplayMode,
  normalizeCycleInterval,
  normalizeDisplayMode,
  isValidViewEntry,
  isValidDashboardConfig,
  DEFAULT_CYCLE_INTERVAL,
  DEFAULT_DISPLAY_MODE,
  DISPLAY_MODE_CSS,
} from '../src/types.js';

describe('isValidDisplayMode', () => {
  it('returns true for valid display modes', () => {
    expect(isValidDisplayMode('contain')).toBe(true);
    expect(isValidDisplayMode('cover')).toBe(true);
    expect(isValidDisplayMode('stretch')).toBe(true);
    expect(isValidDisplayMode('center')).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isValidDisplayMode('invalid')).toBe(false);
    expect(isValidDisplayMode('')).toBe(false);
    expect(isValidDisplayMode(null)).toBe(false);
    expect(isValidDisplayMode(undefined)).toBe(false);
    expect(isValidDisplayMode(42)).toBe(false);
  });
});

describe('normalizeCycleInterval', () => {
  it('returns the value when positive number', () => {
    expect(normalizeCycleInterval(10)).toBe(10);
    expect(normalizeCycleInterval(60)).toBe(60);
  });

  it('returns default for zero, negative, or invalid values', () => {
    expect(normalizeCycleInterval(0)).toBe(DEFAULT_CYCLE_INTERVAL);
    expect(normalizeCycleInterval(-5)).toBe(DEFAULT_CYCLE_INTERVAL);
    expect(normalizeCycleInterval(null)).toBe(DEFAULT_CYCLE_INTERVAL);
    expect(normalizeCycleInterval(undefined)).toBe(DEFAULT_CYCLE_INTERVAL);
    expect(normalizeCycleInterval('30')).toBe(DEFAULT_CYCLE_INTERVAL);
  });
});

describe('normalizeDisplayMode', () => {
  it('returns the value when valid', () => {
    expect(normalizeDisplayMode('contain')).toBe('contain');
    expect(normalizeDisplayMode('cover')).toBe('cover');
    expect(normalizeDisplayMode('stretch')).toBe('stretch');
    expect(normalizeDisplayMode('center')).toBe('center');
  });

  it('returns default for invalid values', () => {
    expect(normalizeDisplayMode('invalid')).toBe(DEFAULT_DISPLAY_MODE);
    expect(normalizeDisplayMode(null)).toBe(DEFAULT_DISPLAY_MODE);
    expect(normalizeDisplayMode(undefined)).toBe(DEFAULT_DISPLAY_MODE);
  });
});

describe('isValidViewEntry', () => {
  it('returns true for valid entries', () => {
    expect(isValidViewEntry({ type: 'image' })).toBe(true);
    expect(isValidViewEntry({ type: 'image', settings: { src: 'x' } })).toBe(true);
  });

  it('returns false for invalid entries', () => {
    expect(isValidViewEntry(null)).toBe(false);
    expect(isValidViewEntry({})).toBe(false);
    expect(isValidViewEntry({ type: '' })).toBe(false);
    expect(isValidViewEntry({ type: 42 })).toBe(false);
    expect(isValidViewEntry('not an object')).toBe(false);
  });
});

describe('isValidDashboardConfig', () => {
  it('returns true for valid configs', () => {
    expect(isValidDashboardConfig({ views: [] })).toBe(true);
    expect(isValidDashboardConfig({ cycleInterval: 10, views: [{ type: 'image' }] })).toBe(true);
  });

  it('returns false for invalid configs', () => {
    expect(isValidDashboardConfig(null)).toBe(false);
    expect(isValidDashboardConfig({})).toBe(false);
    expect(isValidDashboardConfig({ views: 'not array' })).toBe(false);
  });
});

describe('DISPLAY_MODE_CSS', () => {
  it('maps contain to contain', () => {
    expect(DISPLAY_MODE_CSS.contain).toBe('contain');
  });
  it('maps cover to cover', () => {
    expect(DISPLAY_MODE_CSS.cover).toBe('cover');
  });
  it('maps stretch to fill', () => {
    expect(DISPLAY_MODE_CSS.stretch).toBe('fill');
  });
  it('maps center to none', () => {
    expect(DISPLAY_MODE_CSS.center).toBe('none');
  });
});
