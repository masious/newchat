import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { streamSSE } from "hono/streaming";
import { appRouter } from "./trpc/router";
import { createTRPCContext } from "./trpc/init";
import { createDb, conversationMembers, authTokens } from "@newchat/db";
import { verifyToken } from "./lib/jwt";
import { and, eq, lt } from "drizzle-orm";
import { createRedisSubscriber, redisPublisher } from "./lib/redis";
import {
  incrementConcurrency,
  decrementConcurrency,
} from "./lib/rate-limit";
import { createRateLimitMiddleware } from "./middleware/rate-limit";
import {
  markOnline,
  markOffline,
  setPresenceStatus,
  PRESENCE_CHANNEL,
} from "./lib/presence";

const app = new Hono();
const db = createDb();
const TOKEN_TTL_MS = 5 * 60 * 1000;
const PRESENCE_REFRESH_MS = 60_000;
const MAX_SSE_CONNECTIONS = 5;
const SSE_CONN_TTL_SEC = 300;

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
    console.error("Failed to expire tokens", error);
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

// hono logging
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.url} - ${ms}ms`);
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
  const token = c.req.query("token");
  if (!token) {
    return c.json({ error: "Missing token" }, 401);
  }
  const userId = verifyToken(token);
  if (userId === null) {
    return c.json({ error: "Invalid token" }, 401);
  }

  // Enforce max concurrent SSE connections per user
  const sseKey = `sse:conn:${userId}`;
  const connCount = await incrementConcurrency(redisPublisher, sseKey, SSE_CONN_TTL_SEC);
  if (connCount > MAX_SSE_CONNECTIONS) {
    await decrementConcurrency(redisPublisher, sseKey);
    return c.json({ error: "Too many concurrent connections" }, 429);
  }

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
        console.error("Failed to refresh presence status", error);
      });
    }, PRESENCE_REFRESH_MS);

    await stream.writeSSE({
      event: "init",
      data: JSON.stringify({
        userId: userId,
        channels: channelsResult.map((row) => row.conversationId),
      }),
    });

    const keepalive = setInterval(async () => {
      try {
        await stream.writeSSE({ data: "", event: "ping", id: "" });
      } catch {
        clearInterval(keepalive);
        clearInterval(presenceHeartbeat);
        subscriber.disconnect();
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
                console.error("Failed to subscribe to new conversation", err);
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
        clearInterval(keepalive);
        clearInterval(presenceHeartbeat);
        subscriber.disconnect();
      }
    });

    stream.onAbort(() => {
      clearInterval(keepalive);
      clearInterval(presenceHeartbeat);
      subscriber.disconnect();
      decrementConcurrency(redisPublisher, sseKey).catch((err) => {
        console.error("Failed to decrement SSE connection count", err);
      });
      markOffline(userId).catch((err) => {
        console.error("Failed to mark offline", err);
      });
    });

    await new Promise(() => {});
  });
});

const port = Number(process.env.PORT) || 4000;

export default {
  port,
  fetch: app.fetch,
  idleTimeout: 255,
};

console.log(`Server running on http://localhost:${port}`);
