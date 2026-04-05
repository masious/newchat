import type Redis from "ioredis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
};

/**
 * Fixed-window rate limiter using Redis INCR + EXPIRE.
 * Returns whether the request is allowed and how many requests remain.
 */
export async function checkRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSec);
  }

  const ttl = await redis.ttl(key);
  const resetAt = Math.floor(Date.now() / 1000) + Math.max(ttl, 0);

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

/**
 * Increment a concurrency counter with TTL safety net.
 * Returns the current count after incrementing.
 */
export async function incrementConcurrency(
  redis: Redis,
  key: string,
  ttlSec: number,
): Promise<number> {
  const count = await redis.incr(key);
  // Always refresh TTL so it doesn't expire while connections are active
  await redis.expire(key, ttlSec);
  return count;
}

/**
 * Decrement a concurrency counter. Floors at 0.
 */
export async function decrementConcurrency(
  redis: Redis,
  key: string,
): Promise<void> {
  const val = await redis.decr(key);
  if (val < 0) {
    await redis.set(key, 0);
  }
}
