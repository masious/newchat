import type { Context, MiddlewareHandler } from "hono";
import { redisPublisher } from "../lib/redis";
import { checkRateLimit } from "../lib/rate-limit";

type RateLimitConfig = {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
  /** Redis key prefix (e.g. "rl:health") */
  prefix: string;
};

export function getClientIp(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

function setRateLimitHeaders(
  c: Context,
  limit: number,
  remaining: number,
  resetAt: number,
) {
  c.header("X-RateLimit-Limit", String(limit));
  c.header("X-RateLimit-Remaining", String(remaining));
  c.header("X-RateLimit-Reset", String(resetAt));
}

export function createRateLimitMiddleware(
  config: RateLimitConfig,
): MiddlewareHandler {
  return async (c, next) => {
    const ip = getClientIp(c);
    const key = `${config.prefix}:${ip}`;

    const result = await checkRateLimit(
      redisPublisher,
      key,
      config.limit,
      config.windowSec,
    );

    setRateLimitHeaders(c, config.limit, result.remaining, result.resetAt);

    if (!result.allowed) {
      c.header("Retry-After", String(result.resetAt - Math.floor(Date.now() / 1000)));
      return c.json({ error: "Too many requests" }, 429);
    }

    await next();
  };
}
