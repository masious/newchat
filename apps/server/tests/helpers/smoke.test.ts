// Smoke test — validates that test infrastructure works end-to-end:
// setup.ts preloads env vars, factories produce correct shapes, mocks behave.

import { describe, test, expect, beforeEach } from "bun:test";
import {
  createTestUser,
  createTestConversation,
  createTestMessage,
  createTestAuthToken,
  createTestPushSubscription,
  createTestAttachment,
  createTestMessageWithSender,
  createTestConversationSummary,
  resetFactoryCounters,
} from "./factories.test";
import {
  createMockRedis,
  createMockDb,
  createMockDomainEvents,
} from "./mocks";

describe("test setup", () => {
  test("env vars are set by preload", () => {
    expect(process.env.JWT_SECRET).toBe(
      "test-jwt-secret-do-not-use-in-production",
    );
    expect(process.env.R2_ACCOUNT_ID).toBe("test-account-id");
    expect(process.env.NODE_ENV).toBe("test");
  });
});

describe("factories", () => {
  beforeEach(() => {
    resetFactoryCounters();
  });

  test("createTestUser produces unique users", () => {
    const u1 = createTestUser();
    const u2 = createTestUser();
    expect(u1.id).not.toBe(u2.id);
    expect(u1.telegramId).not.toBe(u2.telegramId);
    expect(u1.username).not.toBe(u2.username);
  });

  test("createTestUser respects overrides", () => {
    const user = createTestUser({ username: "custom", firstName: "Alice" });
    expect(user.username).toBe("custom");
    expect(user.firstName).toBe("Alice");
    expect(user.id).toBe(1);
  });

  test("createTestConversation defaults to dm", () => {
    const conv = createTestConversation();
    expect(conv.type).toBe("dm");
    expect(conv.name).toBeNull();
  });

  test("createTestMessage has required fields", () => {
    const msg = createTestMessage({ conversationId: 5, senderId: 3 });
    expect(msg.conversationId).toBe(5);
    expect(msg.senderId).toBe(3);
    expect(msg.content).toContain("Test message");
  });

  test("createTestAuthToken defaults to pending", () => {
    const token = createTestAuthToken();
    expect(token.status).toBe("pending");
    expect(token.userId).toBeNull();
  });

  test("createTestPushSubscription has valid endpoint", () => {
    const sub = createTestPushSubscription({ userId: 42 });
    expect(sub.userId).toBe(42);
    expect(sub.endpoint).toContain("https://");
  });

  test("createTestAttachment has required fields", () => {
    const att = createTestAttachment({ name: "photo.png" });
    expect(att.name).toBe("photo.png");
    expect(att.url).toContain("https://");
    expect(att.size).toBeGreaterThan(0);
  });

  test("createTestMessageWithSender matches domain type", () => {
    const msg = createTestMessageWithSender({ content: "hello" });
    expect(msg.content).toBe("hello");
    expect(msg.id).toBeGreaterThan(0);
  });

  test("createTestConversationSummary matches domain type", () => {
    const summary = createTestConversationSummary({ unreadCount: 5 });
    expect(summary.unreadCount).toBe(5);
    expect(summary.members).toEqual([]);
    expect(summary.lastMessage).toBeNull();
  });
});

describe("mock redis", () => {
  test("get/set with TTL", async () => {
    const redis = createMockRedis();
    await redis.set("key", "value", "EX", 3600);
    const result = await redis.get("key");
    expect(result).toBe("value");
  });

  test("get returns null for missing key", async () => {
    const redis = createMockRedis();
    const result = await redis.get("missing");
    expect(result).toBeNull();
  });

  test("del removes key", async () => {
    const redis = createMockRedis();
    await redis.set("key", "value");
    await redis.del("key");
    expect(await redis.get("key")).toBeNull();
  });

  test("getdel returns and removes", async () => {
    const redis = createMockRedis();
    await redis.set("key", "value");
    const result = await redis.getdel("key");
    expect(result).toBe("value");
    expect(await redis.get("key")).toBeNull();
  });

  test("incr/decr work correctly", async () => {
    const redis = createMockRedis();
    expect(await redis.incr("counter")).toBe(1);
    expect(await redis.incr("counter")).toBe(2);
    expect(await redis.decr("counter")).toBe(1);
  });

  test("publish is callable and returns", async () => {
    const redis = createMockRedis();
    const result = await redis.publish("channel", "message");
    expect(result).toBe(0);
    expect(redis.publish).toHaveBeenCalledWith("channel", "message");
  });
});

describe("mock domain events", () => {
  test("captures emitted events", async () => {
    const events = createMockDomainEvents();
    await events.emit("message.sent", {
      message: {} as any,
      conversationId: 1,
      senderId: 2,
      conversationType: "dm",
      conversationName: null,
    });
    expect(events.emittedEvents).toHaveLength(1);
    expect(events.emittedEvents[0].name).toBe("message.sent");
    expect(events.emittedEvents[0].data).toHaveProperty("conversationId", 1);
  });

  test("calls registered listeners", async () => {
    const events = createMockDomainEvents();
    let received: unknown = null;
    events.on("message.typing", (data: any) => {
      received = data;
    });
    await events.emit("message.typing", { conversationId: 1, userId: 2 });
    expect(received).toEqual({ conversationId: 1, userId: 2 });
  });

  test("clearAll resets state", async () => {
    const events = createMockDomainEvents();
    await events.emit("message.typing", { conversationId: 1, userId: 2 });
    events.clearAll();
    expect(events.emittedEvents).toHaveLength(0);
  });
});

describe("mock db", () => {
  test("query.conversationMembers.findFirst is mockable", async () => {
    const db = createMockDb();
    db.query.conversationMembers.findFirst.mockResolvedValueOnce({
      conversation: { id: 1, type: "dm", name: null, createdBy: null },
    });
    const result = await db.query.conversationMembers.findFirst({} as any);
    expect(result).toHaveProperty("conversation");
    expect(result.conversation.id).toBe(1);
  });

  test("transaction passes db to callback", async () => {
    const db = createMockDb();
    const result = await db.transaction(async (tx: any) => {
      return tx;
    });
    expect(result).toBe(db);
  });
});
