import { beforeEach, describe, expect, test } from "bun:test";
import { createMockRedis } from "../../tests/helpers/mocks";
import { checkRateLimit, decrementConcurrency, incrementConcurrency } from "./rate-limit";

let redis: ReturnType<typeof createMockRedis>;

beforeEach(() => {
  redis = createMockRedis();
});

describe("checkRateLimit", () => {
  test("allows requests under the limit", async () => {
    const result = await checkRateLimit(redis as any, "rl:test", 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  test("denies requests over the limit", async () => {
    // Simulate 5 prior requests
    redis._store.set("rl:test", { value: "5" });
    // incr will make it 6
    const result = await checkRateLimit(redis as any, "rl:test", 5, 60);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test("sets TTL on first request (count === 1)", async () => {
    await checkRateLimit(redis as any, "rl:test", 10, 120);
    expect(redis.expire).toHaveBeenCalledWith("rl:test", 120);
  });

  test("does not reset TTL on subsequent requests", async () => {
    redis._store.set("rl:test", { value: "2" });
    await checkRateLimit(redis as any, "rl:test", 10, 120);
    // count is 3 (not 1), so expire should not be called
    expect(redis.expire).not.toHaveBeenCalledWith("rl:test", 120);
  });

  test("remaining is correct at boundary", async () => {
    redis._store.set("rl:test", { value: "4" });
    const result = await checkRateLimit(redis as any, "rl:test", 5, 60);
    // count = 5, limit = 5 → allowed, remaining = 0
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  test("resetAt is a future Unix timestamp", async () => {
    const before = Math.floor(Date.now() / 1000);
    const result = await checkRateLimit(redis as any, "rl:test", 5, 60);
    expect(result.resetAt).toBeGreaterThanOrEqual(before);
  });
});

describe("incrementConcurrency", () => {
  test("returns incremented count and refreshes TTL", async () => {
    const count = await incrementConcurrency(redis as any, "conc:user:1", 300);
    expect(count).toBe(1);
    expect(redis.expire).toHaveBeenCalledWith("conc:user:1", 300);
  });
});

describe("decrementConcurrency", () => {
  test("decrements the counter", async () => {
    redis._store.set("conc:user:1", { value: "3" });
    await decrementConcurrency(redis as any, "conc:user:1");
    expect(redis._store.get("conc:user:1")?.value).toBe("2");
  });

  test("floors at 0 when counter goes negative", async () => {
    // No key → decr returns -1 → should set to 0
    await decrementConcurrency(redis as any, "conc:user:1");
    // redis.set(key, 0) stores number 0 directly
    const stored = redis._store.get("conc:user:1")?.value;
    expect(Number(stored)).toBe(0);
  });
});
