# ADR-003: Caching Strategy — 3-Tier In-Memory Cache & Rate Limiting

| Field | Value |
|---|---|
| **Status** | ✅ Accepted (Implemented) |
| **Date** | 2026-06-01 |
| **Author** | Principal Architecture Review Board |
| **Last Reviewed** | 2026-07-12 |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

---

## Context

MindScape relies on server-side caches to avoid redundant computation and external API calls. The caching needs fall into three distinct categories with very different characteristics:

| Cache | What It Stores | Expensive Operation | Request Frequency | Acceptable Staleness |
|---|---|---|---|---|
| **AI-generated content** | Mind maps, explanations, examples, summaries, enrichment data | Pollinations.ai API call (5–30s latency) | Moderate (per user action) | Indefinite (idempotent) |
| **API keys** | User's Pollinations API key from Supabase | Supabase DB read + service role auth | Frequent (every AI action) | Low (key rotation rare) |
| **Pollen balance** | User's Pollinations credit balance | External HTTP call to Pollinations balance API | Moderate (per config change) | Very low (user expects real-time) |
| **Rate limit state** | Per-IP request counters | N/A (tracking state only) | Very high (every request) | Zero (real-time enforcement) |

The project runs on Vercel's serverless Node.js runtime. There is no dedicated caching infrastructure (no Redis, no Memcached, no Vercel KV). All caches must be **in-memory**, which means they are ephemeral — lost on cold starts and not shared across instances.

---

## Decision Drivers

| Driver | Weight | Description |
|---|---|---|
| **Cost** | 🔴 Critical | Zero additional infrastructure cost. Must not require Redis, Memcached, or any paid caching service. |
| **Latency Reduction** | 🔴 Critical | Mind map generation takes 10–30s. Caching the result for 1hr eliminates repeated generation of identical topics. API key cache eliminates a Supabase read (50–200ms) on every AI action. |
| **Serverless Ephemerality** | 🟠 High | Vercel cold starts create fresh cache instances. The design must tolerate this gracefully — caches are optimizations, not guarantees. |
| **Memory Bounds** | 🟠 High | No unbounded growth. Stale entries must be evicted. Hard caps on rate limiter entries. |
| **No Shared State** | 🟠 High | Multiple Vercel instances cannot share cache state. This is acceptable because: (a) mind map generation is user-specific, (b) API keys are per-user, (c) balance is per-key, (d) rate limiting is best-effort. |
| **Simplicity** | 🟡 Medium | Avoid introducing a caching library or service. Plain `Map<K, V>` with timestamps is sufficient. |
| **Read-Through Performance** | 🟡 Medium | Cache lookups must be O(1) and synchronous. No async initialization for cache entries. |

---

## Considered Alternatives

### 1. In-Memory Maps (Chosen)

| Aspect | Assessment |
|---|---|
| **Cost** | ✅ Zero. |
| **Latency** | ✅ O(1) lookups, synchronous. |
| **Serverless** | ✅ Works on cold starts (empty cache is just a miss). |
| **Memory** | ⚠️ Requires explicit sweep logic for unbounded growth. Implemented via `setInterval` sweeps. |
| **Shared State** | ❌ Not shared across instances. Each Vercel function has its own Map. Acceptable because all cached data is user-specific. |
| **Persistence** | ❌ Lost on cold start. Acceptable — cache miss just regenerates. |
| **Verdict** | Simple, zero-cost, and sufficient for the project's scale. |

### 2. Vercel KV (Redis)

| Aspect | Assessment |
|---|---|
| **Cost** | ❌ $0.60/GB per month + $0.30/GB transfer. Adds ongoing infrastructure cost. |
| **Latency** | ⚠️ 5–15ms per read (network round trip). |
| **Shared State** | ✅ All instances share the same cache. |
| **Persistence** | ✅ Survives cold starts. |
| **Management** | ⚠️ Requires connection management, error handling, and Vercel KV provisioning. |
| **Verdict** | Overkill for current scale. Worth revisiting if the app reaches 10,000+ DAU and cache misses become a cost or latency concern. |

### 3. Database-Backed Cache (Supabase)

| Aspect | Assessment |
|---|---|
| **Cost** | ✅ Uses existing Supabase instance. |
| **Latency** | ❌ 20–100ms per read/write. Slower than in-memory. |
| **Shared State** | ✅ All instances share the cache. |
| **Persistence** | ✅ Survives cold starts. |
| **Complexity** | ❌ Requires cache table, TTL column, sweep queries. Adds write amplification. |
| **Verdict** | Adds complexity and latency for marginal benefit. Cached AI output is large (10–100KB per map) — storing it in Postgres is wasteful. |

### 4. Vercel Edge Config

| Aspect | Assessment |
|---|---|
| **Cost** | ❌ $2/10GB per month. |
| **Use Case** | ❌ Designed for configuration data (<1MB reads), not dynamic AI responses. |
| **Verdict** | Wrong tool for this use case. |

---

## Decision Outcome

**Three independent in-memory `Map<K, V>` structures** with timestamp-based TTL and periodic sweep timers.

---

## Tier 1: apiCache — AI-Generated Content

### Implementation (`src/lib/cache.ts`)

```typescript
class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 60 * 60 * 1000; // 1 hour
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, { data, timestamp: Date.now() + ttl });
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

  sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp) this.cache.delete(key);
    }
  }

  startSweep(intervalMs: number = 60 * 60 * 1000): void { /* setInterval */ }
  stopSweep(): void { /* clearInterval */ }
}

export const apiCache = new InMemoryCache();
apiCache.startSweep(); // Auto-started at module import
```

### Cache Keys & TTLs

| Cache Key Pattern | TTL | Cached Data | Used By |
|---|---|---|---|
| `map-{topic}-{depth}-{persona}-{apiKey}` | Default (1hr) | `MindMapData` | `generateMindMapAction` |
| `compare-{topic1}-{topic2}-{depth}-{persona}-{apiKey}` | Default (1hr) | `CompareMindMapData` | `generateComparisonMapAction` |
| `explain_{subCategoryName}_{mainTopic}_{mode}_{pdfContext}` | Default (1hr) | `ExplainMindMapNodeOutput` | `explainNodeAction` |
| `example_{topicName}_{mainTopic}_{mode}_{pdfContext}` | Default (1hr) | `ExplainWithExampleOutput` | `explainWithExampleAction` |
| `summary_{topicName}_{mapSizeHash}` | Default (1hr) | `{ summary: string }` | `summarizeTopicAction` |
| `enrich-node-{nodeName}-{mainTopic}` | 2 hours | `NodeEnrichmentOutput` | `enrichNodeAction` (`src/app/actions/enrich-node.ts`) |

### Cache Hit Flow (e.g., `generateMindMapAction`)

```
User Requests "Quantum Computing" (depth=medium, persona=Teacher)
  ↓
generateMindMapAction()
  ↓
cacheKey = "map-Quantum Computing-medium-Teacher-<apiKeyHash>"
  ↓
apiCache.get(cacheKey)
  ├─ HIT → return cached { data, error: null }     ← ~0.1ms, skips all AI work
  └─ MISS → proceed to AI generation
           → resolveApiKey(), searchContext, generateMindMap()
           → mapToMindMapData(), sanitize
           → apiCache.set(cacheKey, sanitized)      ← caches for future requests
           → return { data, error: null }
```

## Tier 2: apiKeyCache — API Key Resolution

### Implementation (`src/app/actions.ts`)

```typescript
const apiKeyCache = new Map<string, { key: string | undefined; timestamp: number }>();
const API_KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Periodic sweep
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - API_KEY_CACHE_TTL;
    for (const [key, entry] of apiKeyCache.entries()) {
      if (entry.timestamp < cutoff) apiKeyCache.delete(key);
    }
  }, 5 * 60 * 1000);
}
```

### Purpose

`resolveApiKey()` is called at the start of **every server action** that makes an AI call — 18+ action functions in `src/app/actions.ts`. Each call previously required a Supabase service-role query on `user_settings` to retrieve the user's Pollinations API key. The cache eliminates this round-trip for 5 minutes after the first lookup.

### Cache Hit Flow

```
resolveApiKey({ userId: "abc123" })
  ↓
1. Check options.apiKey (explicit key from client) → return immediately
  ↓
2. No explicit key → check apiKeyCache.get("abc123")
  ├─ HIT & fresh (<5min) → return cached key         ← ~0.1ms, skips Supabase
  └─ MISS or expired → query Supabase user_settings
           → userSettings.pollinationsApiKey
           → apiKeyCache.set("abc123", { key, timestamp })
           → return key
  ↓
3. Still no key → fall back to process.env.POLLINATIONS_API_KEY
  ↓
4. Still no key → return undefined (caller will error)
```

### Caching Negative Results

The cache also stores **misses** (users without an API key). This prevents repeated Supabase reads for users who haven't configured a key:

```typescript
if (userSettings?.pollinationsApiKey) {
  effectiveApiKey = userSettings.pollinationsApiKey;
  apiKeyCache.set(options.userId, { key: effectiveApiKey, timestamp: Date.now() });
} else {
  // Cache the miss too
  apiKeyCache.set(options.userId, { key: undefined, timestamp: Date.now() });
}
```

## Tier 3: balanceCache — Pollen Balance

### Implementation (`src/app/actions.ts`)

```typescript
const balanceCache = new Map<string, { balance: number | null; error: string | null; timestamp: number }>();

// Sweep stale entries every 60s
function sweepBalanceCache() {
  const cutoff = Date.now() - 60000;
  for (const [key, entry] of balanceCache.entries()) {
    if (entry.timestamp < cutoff) balanceCache.delete(key);
  }
}
if (typeof setInterval !== 'undefined') {
  setInterval(sweepBalanceCache, 60000);
}
```

### Read-Through Behavior

```typescript
const cached = balanceCache.get(cacheKey);
if (cached && now - cached.timestamp < 15000) {   // ← 15-second TTL
  return { balance: cached.balance, error: cached.error };
}
```

The 15-second TTL is a deliberate trade-off:
- **Short enough** that users see near-real-time balance updates (they just spent pollen on a generation)
- **Long enough** to prevent rapid successive calls (e.g., a user clicking "Generate" 5 times rapidly triggers 5 `checkPollenBalanceAction` calls, but only 1 reaches the Pollinations API)

### Why Not Reuse apiCache?

| Reason | Detail |
|---|---|
| **Different TTL** | 15 seconds vs 1 hour. Same class with custom TTL would work but mixing concerns is confusing. |
| **Different sweep cadence** | Balance cache sweeps every 60s. apiCache sweeps every 60min. |
| **Error state caching** | Balance cache stores and returns error states (e.g., "Authorization failed"). apiCache does not cache errors. |
| **Module boundary** | apiCache is in `src/lib/cache.ts` (reusable), balanceCache is local to `actions.ts`. Keeping it local makes it clear this is an internal optimization. |

---

## Bonus: In-Memory Rate Limiter (`src/lib/rate-limit.ts`)

While not a cache in the traditional sense, the rate limiter uses the same in-memory `Map<K, V>` pattern.

### Configuration

| Endpoint Type | Window | Max Requests | Per |
|---|---|---|---|
| `default` | 60s | 60 | IP |
| `chat` | 60s | 20 | IP |
| `ai` | 60s | 10 | IP |
| `scrape` | 60s | 30 | IP |
| `youtube` | 60s | 15 | IP |
| `auth` | 60s | 10 | IP |
| `upload` | 60s | 5 | IP |

### Implementation

```typescript
class InMemoryRateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly MAX_ENTRIES = 10000;

  check(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const record = this.store.get(identifier);

    if (!record || now > record.resetTime) {
      // New window — reset counter
      this.store.set(identifier, { count: 1, resetTime: now + config.windowMs });
      return { success: true, remaining: config.maxRequests - 1, reset: now + config.windowMs };
    }

    if (record.count >= config.maxRequests) {
      return { success: false, remaining: 0, reset: record.resetTime };
    }

    record.count++;
    return { success: true, remaining: config.maxRequests - record.count, reset: record.resetTime };
  }
}
```

### Memory Protection

- **10,000 max entries** — hard cap prevents unbounded growth from IP-based tracking
- **Eviction triggered during lookup when store exceeds capacity** — when a new or expired record is found AND the store exceeds 10,000 entries, expired entries are swept (not on every request)
- **Insertion-order eviction at hard capacity** — if the store is still at capacity after sweeping expired entries, the oldest entry (first in Map insertion order) is evicted to make room
- **Individual record expiry on access** — an individual IP's expired record is evicted naturally when that IP makes a new request (the stale `resetTime` triggers the new-window path)
- **No background sweep timer** — unlike caches, the rate limiter has no background timer; cleanup is purely demand-driven to reduce memory overhead

### Serverless Caveat

> **IMPORTANT**: In Vercel's serverless environment, each cold start creates a fresh `InMemoryRateLimiter` instance. A malicious user could cycle through Vercel instances by waiting for cold starts. For strict production rate limiting, the code should be replaced with Supabase RLS, Vercel KV, or a database-backed approach. The current implementation is a **best-effort limiter** suitable for preventing accidental abuse, not targeted attacks.

---

## Memory Usage Analysis

### apiCache

Each cached entry stores the full AI output (serialized `MindMapData`). Estimated sizes:

| Entry Type | Typical Size | Count | Total |
|---|---|---|---|
| Mind map (low depth) | ~15 KB | 10 | ~150 KB |
| Mind map (deep depth) | ~60 KB | 5 | ~300 KB |
| Comparison map | ~30 KB | 5 | ~150 KB |
| Explanation | ~2 KB | 50 | ~100 KB |
| Example | ~3 KB | 30 | ~90 KB |
| Summary | ~1 KB | 20 | ~20 KB |
| Enrichment | ~4 KB | 30 | ~120 KB |
| **Total typical** | | | **~930 KB** |

### apiKeyCache

| Entry | Size | Max Count | Total |
|---|---|---|---|
| API key per user | ~100 bytes | Active users | Negligible |

### balanceCache

| Entry | Size | Max Count | Total |
|---|---|---|---|
| Balance per API key | ~80 bytes | Concurrent keys | Negligible |

### Rate Limiter

| Entry | Size | Max Count | Total |
|---|---|---|---|
| IP tracking record | ~64 bytes | 10,000 (hard cap) | ~640 KB |

### Total Estimated Memory

~1.6 MB for typical usage — well within a Vercel Node.js function's 512 MB memory limit.

---

## Edge Cases & Failure Scenarios

| Scenario | Behavior | Reason |
|---|---|---|
| **Vercel cold start** | All caches empty → every call is a miss → normal operation with full latency | Caches are optimizations, not requirements |
| **Multiple Vercel instances** | Each instance has its own cache → a hit on one instance is a miss on another | Uniform cache key construction ensures consistent behavior regardless of instance |
| **API key rotation** | At most 5 minutes of stale key due to `apiKeyCache` TTL | After 5 minutes, the cache expires and the new key is fetched from Supabase |
| **Balance update race** | At most 15 seconds of stale balance display | Balance is an estimate; actual balance is checked on every generation attempt |
| **Memory leak from unbounded keys** | Prevented by sweep timers on all 3 caches + hard cap on rate limiter | Sweep intervals: 60min (apiCache), 5min (apiKeyCache), 60s (balanceCache) |
| **Rate limiter overflow** | At 10,000 entries, oldest entry is evicted for new identifiers | Only affects long-running instances with many unique IPs |
| **setInterval not available** | Cache sweep doesn't start (edge runtime guard: `if (typeof setInterval !== 'undefined')`) | Sweep is non-critical; entries expire on read anyway |
| **Concurrent sweeps** | JavaScript is single-threaded (no race conditions on Maps) | Map operations are synchronous and non-preemptible |
| **Cache poison (partial data)** | `StructuredOutputError` — only valid, sanitized data is cached | All data passes through `mapToMindMapData()` before caching |

---

## Comparison: 3-Tier Cache vs Redis

| Aspect | 3-Tier In-Memory | Redis (Vercel KV) |
|---|---|---|
| **Latency** | ~0.01ms (in-process) | ~5–15ms (network) |
| **Cost** | $0 | ~$0.60/mo + usage |
| **Shared across instances** | ❌ | ✅ |
| **Survives cold start** | ❌ | ✅ |
| **Hard memory limit** | Implicit (Vercel 512MB function limit) | Explicit (256 MB default) |
| **Eviction strategy** | TTL-based sweep | TTL-based + LRU |
| **Management overhead** | None | Connection pool, error handling, env vars |
| **Setup time** | 0 (came with first implementation) | 30 min + provisioning |

**Verdict**: In-memory is the right choice for the current scale (single-digit thousands of DAU). Redis is a **recommended upgrade path** for:
- 10,000+ DAU where cache misses across instances become costly
- Multi-region deployments where instance-level caches are inefficient
- Situations where rate limiting must be strict (shared state prevents instance cycling)

---

## Cached Action Reference

Every server action in `src/app/actions.ts` that uses caching:

| Action | Cache Used | Cache Key | Notes |
|---|---|---|---|
| `generateMindMapAction` | apiCache | `map-{topic}-{depth}-{persona}-{apiKey}` | 1hr TTL |
| `generateComparisonMapAction` | apiCache | `compare-{topic1}-{topic2}-{depth}-{persona}-{apiKey}` | 1hr TTL |
| `explainNodeAction` | apiCache | `explain_{name}_{mainTopic}_{mode}_{aware}` | 1hr TTL |
| `explainWithExampleAction` | apiCache | `example_{name}_{mainTopic}_{mode}_{aware}` | 1hr TTL |
| `summarizeTopicAction` | apiCache | `summary_{topicName}_{mapSizeHash}` | 1hr TTL |
| `enrichNodeAction` | apiCache | `enrich-node-{nodeName}-{mainTopic}` | 2hr TTL (per `actions/enrich-node.ts`) |
| `resolveApiKey` | apiKeyCache | `userId` | 5min TTL, caches misses too |
| `checkPollenBalanceAction` | balanceCache | `apiKey` | 15s TTL |
| All API routes | Rate limiter | `IP:endpoint` | Per-endpoint config |

---

## References

| File | Role |
|---|---|
| `src/lib/cache.ts` | `InMemoryCache` class with `set`, `get`, `delete`, `sweep`, `startSweep`, `stopSweep` |
| `src/app/actions.ts` — `resolveApiKey()` | `apiKeyCache` (Map), 5min TTL, caches misses |
| `src/app/actions.ts` — `checkPollenBalanceAction()` | `balanceCache` (Map), 15s read-through TTL, 60s sweep |
| `src/app/actions.ts` — various generation actions | `apiCache` usage for mind maps, explanations, examples, summaries |
| `src/app/actions/enrich-node.ts` | `apiCache` with 2hr TTL for node enrichment |
| `src/lib/rate-limit.ts` | `InMemoryRateLimiter` class with per-endpoint configs |
| `src/lib/env.ts` | Environment variable validation (no cache-specific vars needed) |
| `docs/ARCHITECTURE.md` | System architecture overview referencing caching layer |

---

## Changelog

| Date | Change |
|---|---|
| 2026-06-01 | Initial ADR created |
| 2026-07-12 | Expanded with detailed TTL values, sweep mechanics, memory analysis, Redis comparison, and cached action reference |
