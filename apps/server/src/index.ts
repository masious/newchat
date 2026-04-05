import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { streamSSE } from "hono/streaming";
import { appRouter } from "./trpc/router";
import { createTRPCContext } from "./trpc/init";
import { createDb, conversationMembers, authTokens, and, eq, lt } from "@newchat/db";

import { createRedisSubscriber, redisPublisher } from "./lib/redis";
import { decrementConcurrency } from "./lib/rate-limit";
import { createRateLimitMiddleware } from "./middleware/rate-limit";
import {
  markOnline,
  markOffline,
  setPresenceStatus,
  PRESENCE_CHANNEL,
} from "./lib/presence";
import { logger } from "./lib/logger";

const app = new Hono();
const db = createDb();

// Security headers
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
});
const TOKEN_TTL_MS = 5 * 60 * 1000;
const PRESENCE_REFRESH_MS = 60_000;
const MAX_SSE_CONNECTIONS = 5;
const SSE_CONN_TTL_SEC = 300;
const SSE_MAX_LIFETIME_MS = 24 * 60 * 60 * 1000;

async function expirePendingTokens() {
  const cutoff = new Date(Date.now() - TOKEN_TTL_MS);
  try {
    await db
      .update(authTokens)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(eq(authTokens.status, "pending"), lt(authTokens.createdAt, cutoff)),
      );
  } catch (error) {
    logger.error({ error }, "Failed to expire tokens");
  }
}

// Run immediately and then repeat every minute
expirePendingTokens();
setInterval(expirePendingTokens, 60_000);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:3001", "http://192.168.0.113:3001",
    "https://localhost:3000", "https://localhost:3001", "https://192.168.0.113:3001"
  ];

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      return null;
    },
    credentials: true,
    exposeHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Retry-After",
    ],
  }),
);

// Request logging
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(
    { method: c.req.method, path: new URL(c.req.url).pathname, status: c.res.status, ms },
    "request",
  );
});

// Health check
app.get(
  "/health",
  createRateLimitMiddleware({ limit: 60, windowSec: 60, prefix: "rl:health" }),
  (c) => c.json({ status: "ok" }),
);

// tRPC
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: createTRPCContext,
  }),
);

// SSE endpoint for real-time events
app.get("/events", async (c) => {
  const ticket = c.req.query("ticket");
  if (!ticket) {
    return c.json({ error: "Missing ticket" }, 401);
  }
  const ticketKey = `sse:ticket:${ticket}`;
  const rawUserId = await redisPublisher.getdel(ticketKey);
  if (!rawUserId) {
    return c.json({ error: "Invalid or expired ticket" }, 401);
  }
  const userId = Number(rawUserId);
  if (Number.isNaN(userId)) {
    return c.json({ error: "Invalid ticket data" }, 401);
  }

  // Enforce max concurrent SSE connections per user
  const sseKey = `sse:conn:${userId}`;
  const currentCount = await redisPublisher.incr(sseKey);
  if (currentCount > MAX_SSE_CONNECTIONS) {
    // Decrement but do NOT refresh TTL — let stale counts expire naturally
    await redisPublisher.decr(sseKey);
    return c.json({ error: "Too many concurrent connections" }, 429);
  }
  // Only refresh TTL after successful admission
  await redisPublisher.expire(sseKey, SSE_CONN_TTL_SEC);

  return streamSSE(c, async (stream) => {
    await markOnline(userId);
    const channelsResult = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId));

    const subscriber = createRedisSubscriber();
    const conversationChannels = new Set(
      channelsResult.map(
        ({ conversationId }) => `conversation:${conversationId}`,
      ),
    );

    if (conversationChannels.size > 0) {
      await subscriber.subscribe(...conversationChannels);
    }
    const membershipChannel = `user:${userId}:membership`;
    const presenceChannel = PRESENCE_CHANNEL;
    await subscriber.subscribe(membershipChannel);
    await subscriber.subscribe(presenceChannel);
    const presenceHeartbeat = setInterval(() => {
      setPresenceStatus(userId, {
        status: "online",
        lastSeen: new Date().toISOString(),
      }).catch((error) => {
        logger.error({ error }, "Failed to refresh presence status");
      });
      // Keep concurrency key alive while connection is active
      redisPublisher.expire(sseKey, SSE_CONN_TTL_SEC).catch(() => {});
    }, PRESENCE_REFRESH_MS);

    await stream.writeSSE({
      event: "init",
      data: JSON.stringify({
        userId: userId,
        channels: channelsResult.map((row) => row.conversationId),
      }),
    });

    let cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      clearInterval(keepalive);
      clearInterval(presenceHeartbeat);
      subscriber.disconnect();
      decrementConcurrency(redisPublisher, sseKey).catch((err) => {
        logger.error({ err }, "Failed to decrement SSE connection count");
      });
      markOffline(userId).catch((err) => {
        logger.error({ err }, "Failed to mark offline");
      });
    }

    const keepalive = setInterval(async () => {
      try {
        await stream.writeSSE({ data: "", event: "ping", id: "" });
      } catch {
        cleanup();
      }
    }, 30_000);

    subscriber.on("message", async (channel, message) => {
      let parsed: unknown = message;
      try {
        parsed = JSON.parse(message);
      } catch {
        parsed = message;
      }

      try {
        if (channel === membershipChannel) {
          const data = parsed as
            | {
                type?: "join" | "leave";
                conversationId?: number;
              }
            | string;
          if (
            typeof data === "object" &&
            data &&
            "type" in data &&
            data.type === "join" &&
            typeof data.conversationId === "number"
          ) {
            const newChannel = `conversation:${data.conversationId}`;
            if (!conversationChannels.has(newChannel)) {
              try {
                await subscriber.subscribe(newChannel);
                conversationChannels.add(newChannel);
              } catch (err) {
                logger.error({ err }, "Failed to subscribe to new conversation");
              }
            }
          } else if (
            typeof data === "object" &&
            data &&
            "type" in data &&
            data.type === "leave" &&
            typeof data.conversationId === "number"
          ) {
            const existingChannel = `conversation:${data.conversationId}`;
            if (conversationChannels.has(existingChannel)) {
              await subscriber.unsubscribe(existingChannel);
              conversationChannels.delete(existingChannel);
            }
          }
          await stream.writeSSE({
            event: "membership",
            data: JSON.stringify(parsed),
          });
          return;
        }

        if (channel === presenceChannel) {
          await stream.writeSSE({ event: "presence", data: JSON.stringify(parsed) });
          return;
        }

        await stream.writeSSE({
          event: "conversation_event",
          data: JSON.stringify({ channel, payload: parsed }),
        });
      } catch {
        cleanup();
      }
    });

    stream.onAbort(() => {
      cleanup();
    });

    await new Promise<void>((resolve) => {
      const lifetimeTimer = setTimeout(resolve, SSE_MAX_LIFETIME_MS);
      stream.onAbort(() => clearTimeout(lifetimeTimer));
    });
  });
});

const port = Number(process.env.PORT) || 4000;

export default {
  port,
  fetch: app.fetch,
  idleTimeout: 255,
};

logger.info({ port }, "Server running");
