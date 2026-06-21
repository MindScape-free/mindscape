// src/lib/cache.ts
// Simple in-memory cache for Server Actions and API responses
// Useful for idempotent operations like explaining a node or summarizing concepts,
// as proposed in the optimization plan.

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

class InMemoryCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    // Default TTL: 1 hour (in ms)
    private defaultTTL: number = 60 * 60 * 1000;
    private sweepTimer: ReturnType<typeof setInterval> | null = null;

    set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now() + ttl,
        });
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.timestamp) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    /** Evict only expired entries — run periodically to prevent memory leaks */
    sweep(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.timestamp) {
                this.cache.delete(key);
            }
        }
    }

    /** Start periodic sweep. Call from a controlled lifecycle, not module scope. */
    startSweep(intervalMs: number = 60 * 60 * 1000): void {
        if (this.sweepTimer) return;
        this.sweepTimer = setInterval(() => this.sweep(), intervalMs);
    }

    /** Stop periodic sweep. Call on component unmount or serverless handler cleanup. */
    stopSweep(): void {
        if (this.sweepTimer) {
            clearInterval(this.sweepTimer);
            this.sweepTimer = null;
        }
    }
}

// Export a singleton instance
export const apiCache = new InMemoryCache();

// Start sweep in a try block to survive edge-runtime environments that lack setInterval
if (typeof setInterval !== 'undefined') {
  try {
    apiCache.startSweep();
  } catch {
    // Edge runtime may throw; sweep isn't critical
  }
}
