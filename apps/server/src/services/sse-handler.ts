import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type { Database } from "@newchat/db";
import { conversationMembers, eq } from "@newchat/db";

import { createRedisSubscriber, redisPublisher } from "../lib/redis";
import { decrementConcurrency } from "../lib/rate-limit";
import {
  markOnline,
  markOffline,
  setPresenceStatus,
  PRESENCE_CHANNEL,
} from "../lib/presence";
import { logger } from "../lib/logger";
import {
  MAX_SSE_CONNECTIONS,
  SSE_CONN_TTL_SEC,
  SSE_MAX_LIFETIME_MS,
  SSE_KEEPALIVE_MS,
  PRESENCE_HEARTBEAT_MS,
} from "../lib/constants";

// ── AUTHENTICATING ──────────────────────────────────────────────

async function authenticateTicket(c: Context) {
  const ticket = c.req.query("ticket");
  if (!ticket) {
    return { error: c.json({ error: "Missing ticket" }, 401) };
  }

  const ticketKey = `sse:ticket:${ticket}`;
  const rawUserId = await redisPublisher.getdel(ticketKey);
  if (!rawUserId) {
    return { error: c.json({ error: "Invalid or expired ticket" }, 401) };
  }

  const userId = Number(rawUserId);
  if (Number.isNaN(userId)) {
    return { error: c.json({ error: "Invalid ticket data" }, 401) };
  }

  // Enforce max concurrent SSE connections per user
  const sseKey = `sse:conn:${userId}`;
  const currentCount = await redisPublisher.incr(sseKey);
  if (currentCount > MAX_SSE_CONNECTIONS) {
    await redisPublisher.decr(sseKey);
    return { error: c.json({ error: "Too many concurrent connections" }, 429) };
  }
  await redisPublisher.expire(sseKey, SSE_CONN_TTL_SEC);

  return { userId, sseKey };
}

// ── SUBSCRIBING ─────────────────────────────────────────────────

async function subscribe(db: Database, userId: number) {
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
  await subscriber.subscribe(membershipChannel);
  await subscriber.subscribe(PRESENCE_CHANNEL);

  return {
    subscriber,
    conversationChannels,
    membershipChannel,
    initialChannels: channelsResult.map((row) => row.conversationId),
  };
}

// ── ACTIVE → message routing ────────────────────────────────────

function handleMessage(
  channel: string,
  message: string,
  membershipChannel: string,
  conversationChannels: Set<string>,
  subscriber: ReturnType<typeof createRedisSubscriber>,
) {
  let parsed: unknown = message;
  try {
    parsed = JSON.parse(message);
  } catch {
    parsed = message;
  }

  if (channel === membershipChannel) {
    return {
      event: "membership" as const,
      data: parsed,
      sideEffect: async () => {
        const data = parsed as
          | { type?: "join" | "leave"; conversationId?: number }
          | string;
        if (
          typeof data === "object" &&
          data &&
          "type" in data &&
          typeof data.conversationId === "number"
        ) {
          if (data.type === "join") {
            const newChannel = `conversation:${data.conversationId}`;
            if (!conversationChannels.has(newChannel)) {
              try {
                await subscriber.subscribe(newChannel);
                conversationChannels.add(newChannel);
              } catch (err) {
                logger.error({ err }, "Failed to subscribe to new conversation");
              }
            }
          } else if (data.type === "leave") {
            const existingChannel = `conversation:${data.conversationId}`;
            if (conversationChannels.has(existingChannel)) {
              await subscriber.unsubscribe(existingChannel);
              conversationChannels.delete(existingChannel);
            }
          }
        }
      },
    };
  }

  if (channel === PRESENCE_CHANNEL) {
    return { event: "presence" as const, data: parsed };
  }

  return {
    event: "conversation_event" as const,
    data: { channel, payload: parsed },
  };
}

// ── CLOSED ──────────────────────────────────────────────────────

function createCleanup(
  userId: number,
  sseKey: string,
  keepalive: ReturnType<typeof setInterval>,
  presenceHeartbeat: ReturnType<typeof setInterval>,
  subscriber: ReturnType<typeof createRedisSubscriber>,
) {
  let cleaned = false;
  return () => {
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
  };
}

// ── Public handler ──────────────────────────────────────────────

export function createSSEHandler(db: Database) {
  return async (c: Context) => {
    const auth = await authenticateTicket(c);
    if ("error" in auth) return auth.error;

    const { userId, sseKey } = auth;

    return streamSSE(c, async (stream) => {
      await markOnline(userId);

      const { subscriber, conversationChannels, membershipChannel, initialChannels } =
        await subscribe(db, userId);

      const presenceHeartbeat = setInterval(() => {
        setPresenceStatus(userId, {
          status: "online",
          lastSeen: new Date().toISOString(),
        }).catch((error) => {
          logger.error({ error }, "Failed to refresh presence status");
        });
        redisPublisher.expire(sseKey, SSE_CONN_TTL_SEC).catch(() => {});
      }, PRESENCE_HEARTBEAT_MS);

      await stream.writeSSE({
        event: "init",
        data: JSON.stringify({ userId, channels: initialChannels }),
      });

      // Keepalive must be declared before cleanup references it
      const keepalive = setInterval(async () => {
        try {
          await stream.writeSSE({ data: "", event: "ping", id: "" });
        } catch {
          cleanup();
        }
      }, SSE_KEEPALIVE_MS);

      const cleanup = createCleanup(userId, sseKey, keepalive, presenceHeartbeat, subscriber);

      subscriber.on("message", async (channel, message) => {
        try {
          const result = handleMessage(
            channel,
            message,
            membershipChannel,
            conversationChannels,
            subscriber,
          );
          if ("sideEffect" in result && result.sideEffect) {
            await result.sideEffect();
          }
          await stream.writeSSE({
            event: result.event,
            data: JSON.stringify(result.data),
          });
        } catch {
          cleanup();
        }
      });

      stream.onAbort(() => cleanup());

      await new Promise<void>((resolve) => {
        const lifetimeTimer = setTimeout(resolve, SSE_MAX_LIFETIME_MS);
        stream.onAbort(() => clearTimeout(lifetimeTimer));
      });
    });
  };
}
