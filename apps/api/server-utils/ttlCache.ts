type CacheEntry<T> = {
    expiresAt: number;
    value: T;
};

const cache = new Map<string, CacheEntry<unknown>>();

export const parseCacheTtlMs = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const getCachedValue = <T>(key: string): T | undefined => {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
        cache.delete(key);
        return undefined;
    }
    return entry.value as T;
};

export const setCachedValue = <T>(key: string, value: T, ttlMs: number) => {
    if (ttlMs <= 0) return value;
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
};

export const getOrSetCachedValue = async <T>(key: string, ttlMs: number, loader: () => Promise<T>) => {
    const cached = getCachedValue<T>(key);
    if (cached !== undefined) return cached;
    return setCachedValue(key, await loader(), ttlMs);
};

export const deleteCachedValue = (key: string) => {
    cache.delete(key);
};

export const deleteCachedValuesByPrefix = (prefix: string) => {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) cache.delete(key);
    }
};
