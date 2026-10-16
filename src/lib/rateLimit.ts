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
 *
 * ⚠️ This applies to EVERYTHING in this file, including startAttempt()
 * below (used by login): the effective ceiling is "limit × number of
 * warm instances", counters reset on every cold start, and nothing here
 * is shared between instances. Moving to a shared store is a separate,
 * deliberate decision (see the rate-limiting review, step 3).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Failure-only buckets (see startAttempt below). Declared up here so the
// cleanup timer can purge both maps.
interface AttemptBucket {
  /** Failed attempts counted in the current window. */
  failures: number;
  /** Attempts that have reserved a slot and are still being processed. */
  inFlight: number;
  /** When the current failure window ends. Only meaningful if failures > 0. */
  resetAt: number;
}

const attemptBuckets = new Map<string, AttemptBucket>();

// Periodically drop expired buckets so the Maps don't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  for (const [key, bucket] of attemptBuckets) {
    if (bucket.inFlight > 0) continue; // never drop a bucket someone still holds
    if (bucket.failures === 0 || bucket.resetAt <= now) {
      attemptBuckets.delete(key);
    }
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

// ---------------------------------------------------------------------------
// Failure-only limiter (used by login)
//
// checkRateLimit() above counts EVERY call, which is the wrong thing for
// login: successful logins would eat into the budget, and "reset on success"
// lets an attacker with one valid account wipe their own IP counter.
//
// startAttempt() instead:
//   1. checks `failures + inFlight < limit` and, if allowed, reserves a slot
//      in the SAME synchronous step (no await in between). This is what
//      stops concurrent requests from all passing the check before any of
//      them has finished the slow password comparison.
//   2. only a later guard.fail() turns the reservation into a counted
//      failure; guard.done() frees the slot WITHOUT counting anything.
// So, once everything has settled, the counter holds failures only, and the
// total number of guesses per window can never exceed `limit`.
// ---------------------------------------------------------------------------

export interface AttemptGuard {
  /** false = the limit is reached; nothing was reserved. */
  readonly allowed: boolean;
  /** When the failure window ends (ms epoch); 0 if there is no window yet. */
  readonly resetAt: number;
  /** The attempt failed authentication: free the slot AND count a failure. */
  fail(): void;
  /** The attempt did not fail (success, or aborted): free the slot only. */
  done(): void;
}

function currentAttemptBucket(key: string, now: number): AttemptBucket {
  let bucket = attemptBuckets.get(key);
  if (!bucket) {
    bucket = { failures: 0, inFlight: 0, resetAt: 0 };
    attemptBuckets.set(key, bucket);
  }
  if (bucket.failures > 0 && bucket.resetAt <= now) {
    bucket.failures = 0; // failure window expired
    bucket.resetAt = 0;
  }
  return bucket;
}

export function startAttempt(
  key: string,
  limit: number,
  windowMs: number
): AttemptGuard {
  const now = Date.now();
  const bucket = currentAttemptBucket(key, now);

  if (bucket.failures + bucket.inFlight >= limit) {
    return {
      allowed: false,
      resetAt: bucket.resetAt || now + 1000,
      fail() {},
      done() {},
    };
  }

  bucket.inFlight += 1; // reserved synchronously, right after the check
  let settled = false;

  return {
    allowed: true,
    resetAt: bucket.resetAt,
    fail() {
      if (settled) return;
      settled = true;
      bucket.inFlight -= 1;
      const t = Date.now();
      if (bucket.failures > 0 && bucket.resetAt <= t) bucket.failures = 0;
      if (bucket.failures === 0) bucket.resetAt = t + windowMs;
      bucket.failures += 1;
    },
    done() {
      if (settled) return;
      settled = true;
      bucket.inFlight -= 1;
    },
  };
}

/**
 * Clears the FAILURE count for `key` (e.g. the owner of an email address just
 * proved the password). Slots that are still in flight are kept, so requests
 * already being processed stay accounted for. Never call this for an IP key.
 */
export function clearFailures(key: string): void {
  const bucket = attemptBuckets.get(key);
  if (!bucket) return;
  bucket.failures = 0;
  bucket.resetAt = 0;
  if (bucket.inFlight === 0) attemptBuckets.delete(key);
}

/** Best-effort client IP extraction behind Vercel's proxy. */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
