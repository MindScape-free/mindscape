type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

const rateLimits: Record<string, RateLimitConfig> = {
  default: { windowMs: 60 * 1000, maxRequests: 60 },
  ai: { windowMs: 60 * 1000, maxRequests: 10 },
  scrape: { windowMs: 60 * 1000, maxRequests: 30 },
  auth: { windowMs: 60 * 1000, maxRequests: 10 },
  upload: { windowMs: 60 * 1000, maxRequests: 5 },
};

/**
 * In-memory rate limiter with automatic eviction of expired entries
 * on every check — no background sweep timer needed.
 *
 * NOTE: In serverless environments (Vercel, Netlify), each cold start
 * creates a fresh instance, making this a best-effort limiter.
 * For strict production rate limiting, replace with Supabase RLS,
 * Vercel KV, or a database-backed approach.
 */
class InMemoryRateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly MAX_ENTRIES = 10000;

  check(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const key = identifier;

    // Evict expired entries on every check to prevent memory leaks
    // without requiring a background timer.
    if (this.store.size > this.MAX_ENTRIES) {
      for (const [k, v] of this.store) {
        if (now > v.resetTime) {
          this.store.delete(k);
        }
      }
    }

    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // Prevent unbounded growth: if store is at capacity, evict oldest
      if (this.store.size >= this.MAX_ENTRIES) {
        const oldest = this.store.entries().next().value;
        if (oldest) this.store.delete(oldest[0]);
      }
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return {
        success: true,
        remaining: config.maxRequests - 1,
        reset: now + config.windowMs,
      };
    }

    if (record.count >= config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        reset: record.resetTime,
      };
    }

    record.count++;
    return {
      success: true,
      remaining: config.maxRequests - record.count,
      reset: record.resetTime,
    };
  }
}

const inMemoryLimiter = new InMemoryRateLimiter();

export function rateLimit(
  identifier: string,
  type: keyof typeof rateLimits = 'default'
): RateLimitResult {
  const config = rateLimits[type];
  return inMemoryLimiter.check(identifier, config);
}

export function createRateLimitResponse(result: RateLimitResult): Response | null {
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
        reset: new Date(result.reset).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.reset),
        },
      }
    );
  }
  return null;
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

export const RATE_LIMITS = rateLimits;
