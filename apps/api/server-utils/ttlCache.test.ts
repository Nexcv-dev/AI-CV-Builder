import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteCachedValue,
  deleteCachedValuesByPrefix,
  getCachedValue,
  getOrSetCachedValue,
  parseCacheTtlMs,
  setCachedValue,
} from './ttlCache';

describe('ttlCache', () => {
  afterEach(() => {
    vi.useRealTimers();
    deleteCachedValuesByPrefix('test:');
  });

  it('parses non-negative TTL values and rejects invalid configuration', () => {
    expect(parseCacheTtlMs('0', 500)).toBe(0);
    expect(parseCacheTtlMs('1200', 500)).toBe(1200);
    expect(parseCacheTtlMs('-1', 500)).toBe(500);
    expect(parseCacheTtlMs('invalid', 500)).toBe(500);
  });

  it('returns cached values until their TTL expires', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-13T00:00:00.000Z'));
    setCachedValue('test:expiring', { enabled: true }, 1000);

    expect(getCachedValue('test:expiring')).toEqual({ enabled: true });
    vi.advanceTimersByTime(1000);
    expect(getCachedValue('test:expiring')).toBeUndefined();
  });

  it('loads only on a cache miss and supports exact and prefix invalidation', async () => {
    const loader = vi.fn().mockResolvedValue('loaded');

    expect(await getOrSetCachedValue('test:group:first', 1000, loader)).toBe('loaded');
    expect(await getOrSetCachedValue('test:group:first', 1000, loader)).toBe('loaded');
    expect(loader).toHaveBeenCalledTimes(1);

    setCachedValue('test:group:second', 'second', 1000);
    deleteCachedValue('test:group:first');
    expect(getCachedValue('test:group:first')).toBeUndefined();
    expect(getCachedValue('test:group:second')).toBe('second');

    deleteCachedValuesByPrefix('test:group:');
    expect(getCachedValue('test:group:second')).toBeUndefined();
  });

  it('does not retain values when caching is disabled', async () => {
    const loader = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    expect(await getOrSetCachedValue('test:disabled', 0, loader)).toBe('first');
    expect(await getOrSetCachedValue('test:disabled', 0, loader)).toBe('second');
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
