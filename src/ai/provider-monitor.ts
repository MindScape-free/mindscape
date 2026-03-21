
/**
 * Simple in-memory provider health monitor.
 * Tracks failure rates and manages degradation states.
 */

export type ProviderStatus = 'healthy' | 'degraded' | 'down';

interface ProviderStats {
    failures: number;
    successes: number;
    lastFailureAt: number;
    degradedUntil: number;
}

class ProviderMonitor {
    private stats: Record<string, ProviderStats> = {};
    private readonly WINDOW_SIZE = 20;
    private readonly FAILURE_THRESHOLD = 0.25; // 25% failure rate triggers degradation
    private readonly DEGRADE_DURATION = 10 * 60 * 1000; // 10 minutes

    recordSuccess(provider: string) {
        const s = this.getOrCreateStats(provider);
        s.successes++;

        // If we were degraded, success can help "heal" but we still wait for timer usually.
        // For now, let timers handle it for simplicity.
    }

    recordFailure(provider: string) {
        const s = this.getOrCreateStats(provider);
        s.failures++;
        s.lastFailureAt = Date.now();

        // Check if we should degrade
        const total = s.successes + s.failures;
        if (total >= 5 && (s.failures / total) >= this.FAILURE_THRESHOLD) {
            console.warn(`🛑 Provider ${provider} exhibiting high failure rate (${Math.round((s.failures / total) * 100)}%). Degrading...`);
            s.degradedUntil = Date.now() + this.DEGRADE_DURATION;
        }
    }

    getStatus(provider: string): ProviderStatus {
        const s = this.stats[provider];
        if (!s) return 'healthy';

        if (Date.now() < s.degradedUntil) {
            return 'degraded';
        }

        return 'healthy';
    }

    getReport() {
        return Object.entries(this.stats).map(([name, stat]) => ({
            name,
            status: this.getStatus(name),
            ...stat
        }));
    }

    private getOrCreateStats(provider: string): ProviderStats {
        if (!this.stats[provider]) {
            this.stats[provider] = {
                failures: 0,
                successes: 0,
                lastFailureAt: 0,
                degradedUntil: 0
            };
        }
        return this.stats[provider];
    }
}

// Singleton instance
export const providerMonitor = new ProviderMonitor();
