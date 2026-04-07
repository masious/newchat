import type { Database } from "@newchat/db";
import { redisPublisher } from "./redis";
import { PRESENCE_TTL_SEC } from "./constants";
import { updateLastSeen, getLastSeenAt } from "../data/user-queries";
import { logger } from "./logger";

export type PresenceStatus = {
  status: "online" | "offline";
  lastSeen: string;
};
const presenceKey = (userId: number) => `presence:${userId}`;

export const PRESENCE_CHANNEL = "presence:updates";

export async function setPresenceStatus(
  userId: number,
  status: PresenceStatus,
) {
  await redisPublisher.set(
    presenceKey(userId),
    JSON.stringify(status),
    "EX",
    PRESENCE_TTL_SEC,
  );
}

export async function markOnline(db: Database, userId: number) {
  const state: PresenceStatus = {
    status: "online",
    lastSeen: new Date().toISOString(),
  };
  await setPresenceStatus(userId, state);
  await publishPresenceEvent(userId, state);
  updateLastSeen(db, userId).catch((err) => {
    logger.error({ err, userId }, "Failed to persist lastSeen to DB");
  });
}

export async function markOffline(db: Database, userId: number) {
  const state: PresenceStatus = {
    status: "offline",
    lastSeen: new Date().toISOString(),
  };
  await setPresenceStatus(userId, state);
  await publishPresenceEvent(userId, state);
  updateLastSeen(db, userId).catch((err) => {
    logger.error({ err, userId }, "Failed to persist lastSeen to DB");
  });
}

export async function publishPresenceEvent(
  userId: number,
  status: PresenceStatus,
) {
  await redisPublisher.publish(
    PRESENCE_CHANNEL,
    JSON.stringify({ userId, ...status }),
  );
}

export async function getPresenceStatus(
  db: Database,
  userId: number,
): Promise<PresenceStatus> {
  const raw = await redisPublisher.get(presenceKey(userId));
  if (raw) {
    try {
      return JSON.parse(raw) as PresenceStatus;
    } catch {
      // Fall through to DB
    }
  }

  const lastSeenAt = await getLastSeenAt(db, userId);
  if (lastSeenAt) {
    return { status: "offline", lastSeen: lastSeenAt.toISOString() };
  }

  return { status: "offline", lastSeen: new Date(0).toISOString() };
}
