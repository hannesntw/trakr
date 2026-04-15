/**
 * In-memory sliding window rate limiter.
 *
 * Works fine for single-instance Vercel functions since each invocation is
 * short-lived. The main purpose is preventing burst abuse within a single
 * instance — not a distributed rate limiter.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 60_000).unref?.();

/**
 * Check whether a request identified by `key` exceeds the rate limit.
 *
 * @param key     Unique identifier (e.g. IP + route)
 * @param limit   Maximum requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns `{ limited, remaining }` — `limited` is true when the caller should be rejected
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { limited: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // First request in a new window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1 };
  }

  entry.count += 1;

  if (entry.count > limit) {
    return { limited: true, remaining: 0 };
  }

  return { limited: false, remaining: limit - entry.count };
}
