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
}

// Export a singleton instance
export const apiCache = new InMemoryCache();
