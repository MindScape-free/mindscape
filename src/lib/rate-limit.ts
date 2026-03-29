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

class InMemoryRateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  check(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const key = identifier;
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
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

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const inMemoryLimiter = new InMemoryRateLimiter();

setInterval(() => {
  inMemoryLimiter.cleanup();
}, 60000);

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
