/*src\lib\ratelimi.ts  */
/**
 * Lightweight in-memory rate limiter.
 *
 * ⚠️ Important limitation: this state lives in the memory of a single
 * serverless function instance. On Vercel, that means it only protects
 * against repeated requests handled by the SAME warm instance — it does
 * NOT provide guaranteed protection across cold starts or multiple
 * concurrent instances. For a real pilot with meaningful traffic, this
 * should eventually be replaced with a shared store (e.g. Upstash Redis).
 *
 * For now, at pilot scale, this still meaningfully raises the cost of a
 * naive brute-force / credential-stuffing attempt and is far better than
 * no protection at all.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the Map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Increments the counter for `key` and checks it against `limit` within
 * `windowMs`. Call this once per attempt (e.g. once per failed login).
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Clears the counter for `key` — call this on a successful login. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Best-effort client IP extraction behind Vercel's proxy. */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
