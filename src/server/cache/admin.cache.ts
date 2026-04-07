interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheStore {
  [key: string]: CacheEntry<any>;
}

const memoryCache: CacheStore = {};

const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds

export function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const entry = memoryCache[key];

  if (entry && now - entry.timestamp < ttlMs) {
    return Promise.resolve(entry.data as T);
  }

  return fetcher().then((data) => {
    memoryCache[key] = {
      data,
      timestamp: now,
    };
    return data;
  });
}

export function invalidateCache(key?: string): void {
  if (key) {
    delete memoryCache[key];
  } else {
    Object.keys(memoryCache).forEach((k) => {
      delete memoryCache[k];
    });
  }
}

export function getCacheAge(key: string): number | null {
  const entry = memoryCache[key];
  if (!entry) return null;
  return Date.now() - entry.timestamp;
}

export function isCacheValid(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const entry = memoryCache[key];
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttlMs;
}

export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<{ data: T; fromCache: boolean; age: number }> {
  const now = Date.now();
  const entry = memoryCache[key];

  if (entry && now - entry.timestamp < ttlMs) {
    return {
      data: entry.data as T,
      fromCache: true,
      age: now - entry.timestamp,
    };
  }

  const data = await fetcher();
  memoryCache[key] = {
    data,
    timestamp: now,
  };

  return {
    data,
    fromCache: false,
    age: 0,
  };
}
