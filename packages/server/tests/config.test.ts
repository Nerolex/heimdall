import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../src/config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('node:fs');

describe('loadConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and parses a valid config file', () => {
    const validConfig = JSON.stringify({
      cycleInterval: 10,
      views: [{ type: 'image', settings: { src: '/assets/test.png' } }],
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(validConfig);

    const result = loadConfig('/fake/config.json');
    expect(result.config).toBeDefined();
    expect(result.config!.views).toHaveLength(1);
    expect(result.config!.cycleInterval).toBe(10);
    expect(result.error).toBeUndefined();
  });

  it('applies default cycleInterval when missing', () => {
    const config = JSON.stringify({ views: [{ type: 'image' }] });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(config);

    const result = loadConfig('/fake/config.json');
    expect(result.config!.cycleInterval).toBe(30);
  });

  it('applies default cycleInterval when invalid (zero or negative)', () => {
    const config = JSON.stringify({ cycleInterval: -5, views: [] });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(config);

    const result = loadConfig('/fake/config.json');
    expect(result.config!.cycleInterval).toBe(30);
  });

  it('returns config_not_found error when file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = loadConfig('/fake/config.json');
    expect(result.config).toBeUndefined();
    expect(result.error).toBe('config_not_found');
  });

  it('returns config_invalid error for malformed JSON', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{ not valid json }');

    const result = loadConfig('/fake/config.json');
    expect(result.config).toBeUndefined();
    expect(result.error).toBe('config_invalid');
    expect(result.message).toBeDefined();
  });

  it('returns config_invalid error when views is not an array', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ views: 'not array' }));

    const result = loadConfig('/fake/config.json');
    expect(result.config).toBeUndefined();
    expect(result.error).toBe('config_invalid');
  });
});
