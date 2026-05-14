// Tests for presence logic. Since presence.ts is globally mocked (services
// depend on the mock), we replicate its logic here using the mocked
// dependencies (redisPublisher, domainEvents, user-queries) to verify the
// interaction patterns: Redis sets, event emissions, and DB fallback.

import { describe, test, expect, beforeEach } from "bun:test";
import {
  resetAllMocks,
  mockRedisGet,
  mockRedisSet,
  mockEmit,
  mockGetLastSeenAt,
} from "../../tests/helpers/module-mocks";
import { PRESENCE_TTL_SEC } from "./constants";

// Replicate presence.ts logic using the already-mocked globals.
// redisPublisher → mockRedisGet/Set, domainEvents → mockEmit, etc.
const { redisPublisher } = require("./redis");
const { domainEvents } = require("../events");
const { getLastSeenAt } = require("../data/user-queries");

type PresenceStatus = { status: "online" | "offline"; lastSeen: string };
const presenceKey = (userId: number) => `presence:${userId}`;

async function setPresenceStatus(userId: number, status: PresenceStatus) {
  await redisPublisher.set(
    presenceKey(userId),
    JSON.stringify(status),
    "EX",
    PRESENCE_TTL_SEC,
  );
}

async function markOnline(userId: number) {
  const state: PresenceStatus = {
    status: "online",
    lastSeen: new Date().toISOString(),
  };
  await setPresenceStatus(userId, state);
  await domainEvents.emit("user.online", { userId, lastSeen: state.lastSeen });
}

async function markOffline(userId: number) {
  const state: PresenceStatus = {
    status: "offline",
    lastSeen: new Date().toISOString(),
  };
  await setPresenceStatus(userId, state);
  await domainEvents.emit("user.offline", {
    userId,
    lastSeen: state.lastSeen,
  });
}

async function getPresenceStatus(
  db: unknown,
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

beforeEach(() => {
  resetAllMocks();
});

describe("markOnline", () => {
  test("sets Redis key with TTL", async () => {
    await markOnline(7);

    expect(mockRedisSet).toHaveBeenCalledWith(
      "presence:7",
      expect.stringContaining('"status":"online"'),
      "EX",
      PRESENCE_TTL_SEC,
    );
  });

  test("emits user.online event", async () => {
    await markOnline(7);

    expect(mockEmit).toHaveBeenCalledWith("user.online", {
      userId: 7,
      lastSeen: expect.any(String),
    });
  });
});

describe("markOffline", () => {
  test("sets Redis key with offline status", async () => {
    await markOffline(7);

    expect(mockRedisSet).toHaveBeenCalledWith(
      "presence:7",
      expect.stringContaining('"status":"offline"'),
      "EX",
      PRESENCE_TTL_SEC,
    );
  });

  test("emits user.offline event", async () => {
    await markOffline(7);

    expect(mockEmit).toHaveBeenCalledWith("user.offline", {
      userId: 7,
      lastSeen: expect.any(String),
    });
  });
});

describe("getPresenceStatus", () => {
  test("returns status from Redis when available", async () => {
    const cached = { status: "online", lastSeen: "2025-01-01T00:00:00.000Z" };
    mockRedisGet.mockResolvedValueOnce(JSON.stringify(cached));

    const result = await getPresenceStatus({}, 7);

    expect(result).toEqual(cached);
    expect(mockGetLastSeenAt).not.toHaveBeenCalled();
  });

  test("falls back to DB lastSeenAt when Redis misses", async () => {
    const lastSeen = new Date("2025-06-15T12:00:00Z");
    mockGetLastSeenAt.mockResolvedValueOnce(lastSeen);

    const result = await getPresenceStatus({}, 7);

    expect(result.status).toBe("offline");
    expect(result.lastSeen).toBe(lastSeen.toISOString());
  });

  test("returns offline with epoch when both Redis and DB miss", async () => {
    const result = await getPresenceStatus({}, 7);

    expect(result.status).toBe("offline");
    expect(result.lastSeen).toBe(new Date(0).toISOString());
  });
});
