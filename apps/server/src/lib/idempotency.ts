import { redisPublisher } from "./redis";
import { IDEMPOTENCY_TTL_SEC } from "./constants";
import { logger } from "./logger";

// Wraps a mutation handler with Redis-backed idempotency. Returns the cached
// response when the same `input.idempotencyKey` has been seen before for this
// user on this path. The input schema MUST include `idempotencyKey: z.string().uuid()`.
//
// On cache miss, runs the handler, caches the successful response for
// IDEMPOTENCY_TTL_SEC, then returns it. Handler errors are not cached.
// Redis failures are logged and do not block execution.
export function idempotent<
  TCtx extends { userId: number },
  TInput extends { idempotencyKey: string },
  TOutput,
>(
  path: string,
  handler: (opts: { ctx: TCtx; input: TInput }) => Promise<TOutput>,
) {
  return async (opts: {
    ctx: TCtx;
    input: TInput;
  }): Promise<TOutput> => {
    const cacheKey = `idem:user:${opts.ctx.userId}:${path}:${opts.input.idempotencyKey}`;

    try {
      const raw = await redisPublisher.get(cacheKey);
      if (raw !== null) {
        return JSON.parse(raw) as TOutput;
      }
    } catch (err) {
      logger.warn({ err, cacheKey }, "Idempotency cache read failed");
    }

    const result = await handler(opts);

    try {
      await redisPublisher.set(
        cacheKey,
        JSON.stringify(result),
        "EX",
        IDEMPOTENCY_TTL_SEC,
      );
    } catch (err) {
      logger.warn({ err, cacheKey }, "Idempotency cache write failed");
    }

    return result;
  };
}
