/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window counter per IP.
 *
 * For production with multiple instances, replace with Redis-backed store.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  },
  5 * 60 * 1000,
);

export interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

/**
 * Check if a request should be rate-limited.
 * Returns { success: true } if allowed, { success: false, retryAfter } if denied.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 30, windowMs: 60_000 },
): { success: true } | { success: false; retryAfter: number } {
  const now = Date.now();
  const key = identifier;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true };
  }

  if (entry.count >= config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, retryAfter };
  }

  entry.count++;
  return { success: true };
}

/**
 * Extract client IP from NextRequest headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "127.0.0.1";
}

/**
 * Rate limit presets for different endpoint types.
 */
export const RATE_LIMITS = {
  /** Strict: signature/proof generation — 10 req/min */
  strict: { limit: 10, windowMs: 60_000 },
  /** Normal: CRUD operations — 30 req/min */
  normal: { limit: 30, windowMs: 60_000 },
  /** Relaxed: read-only queries — 60 req/min */
  relaxed: { limit: 60, windowMs: 60_000 },
} as const;
