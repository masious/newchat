import { redisPublisher } from "./redis";

export type PresenceStatus = {
  status: "online" | "offline";
  lastSeen: string;
};

const PRESENCE_TTL_SECONDS = 60 * 5; // 5 minutes refresh window
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
    PRESENCE_TTL_SECONDS,
  );
}

export async function markOnline(userId: number) {
  const state: PresenceStatus = {
    status: "online",
    lastSeen: new Date().toISOString(),
  };
  await setPresenceStatus(userId, state);
  await publishPresenceEvent(userId, state);
}

export async function markOffline(userId: number) {
  const state: PresenceStatus = {
    status: "offline",
    lastSeen: new Date().toISOString(),
  };
  await setPresenceStatus(userId, state);
  await publishPresenceEvent(userId, state);
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
  userId: number,
): Promise<PresenceStatus> {
  const raw = await redisPublisher.get(presenceKey(userId));
  if (!raw) {
    return { status: "offline", lastSeen: new Date(0).toISOString() };
  }
  try {
    const parsed = JSON.parse(raw) as PresenceStatus;
    return parsed;
  } catch {
    return { status: "offline", lastSeen: new Date(0).toISOString() };
  }
}
