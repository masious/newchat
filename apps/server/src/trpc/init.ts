import { initTRPC, TRPCError } from "@trpc/server";
import { createDb, type Database } from "@newchat/db";
import { verifyToken } from "../lib/jwt";
import { redisPublisher } from "../lib/redis";
import { checkRateLimit } from "../lib/rate-limit";
import {
  PROCEDURE_RATE_LIMITS,
  DEFAULT_RATE_LIMIT,
} from "../middleware/trpc-rate-limit";

let _db: Database | undefined;
function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

type Context = {
  db: Database;
  ip: string;
  token?: string;
  userId?: number;
};

export const createTRPCContext = (
  _opts: unknown,
  c: { req: { header: (name: string) => string | undefined } },
): Context => {
  const token = c.req.header("authorization")?.replace("Bearer ", "");
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown";
  return { db: getDb(), token, ip };
};

const t = initTRPC.context<Context>().create();

export const router = t.router;

const enforceUser = t.middleware(({ ctx, next }) => {
  if (!ctx.token) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const userId = verifyToken(ctx.token);
  if (userId === null) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId } });
});

const rateLimit = t.middleware(async ({ ctx, path, next }) => {
  const config = PROCEDURE_RATE_LIMITS[path] ?? DEFAULT_RATE_LIMIT;

  // Use userId if authenticated, otherwise fall back to IP
  const identifier = ctx.userId ? `user:${ctx.userId}` : `ip:${ctx.ip}`;
  const key = `rl:${path}:${identifier}`;

  const result = await checkRateLimit(
    redisPublisher,
    key,
    config.limit,
    config.windowSec,
  );

  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded",
    });
  }

  return next();
});

// Public procedures: rate limit by IP (no auth required)
export const publicProcedure = t.procedure.use(rateLimit);

// Protected procedures: auth first (resolves userId), then rate limit by userId
export const protectedProcedure = t.procedure.use(enforceUser).use(rateLimit);
