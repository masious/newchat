import { describe, test, expect, beforeEach } from "bun:test";
import {
  resetAllMocks,
  mockRedisGet,
  mockRedisSet,
} from "../../tests/helpers/module-mocks";
import { IDEMPOTENCY_TTL_SEC } from "./constants";
import { idempotent } from "./idempotency";

const ctx = { userId: 1 };
const input = { idempotencyKey: "aaaa-bbbb-cccc-dddd" };
const opts = { ctx, input };

beforeEach(() => {
  resetAllMocks();
});

describe("idempotent", () => {
  test("cache miss → executes handler and returns result", async () => {
    const handler = async () => ({ id: 42 });
    const wrapped = idempotent("test.path", handler);

    const result = await wrapped(opts);

    expect(result).toEqual({ id: 42 });
  });

  test("cache miss → caches result with correct key and TTL", async () => {
    const handler = async () => ({ id: 42 });
    const wrapped = idempotent("test.path", handler);

    await wrapped(opts);

    expect(mockRedisSet).toHaveBeenCalledWith(
      `idem:user:1:test.path:${input.idempotencyKey}`,
      JSON.stringify({ id: 42 }),
      "EX",
      IDEMPOTENCY_TTL_SEC,
    );
  });

  test("cache hit → returns cached result, skips handler", async () => {
    mockRedisGet.mockResolvedValueOnce(JSON.stringify({ id: 99 }));
    const handler = async () => ({ id: 42 });
    const wrapped = idempotent("test.path", handler);

    const result = await wrapped(opts);

    expect(result).toEqual({ id: 99 });
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  test("handler error → not cached, re-throws", async () => {
    const handler = async () => {
      throw new Error("handler failed");
    };
    const wrapped = idempotent("test.path", handler);

    await expect(wrapped(opts)).rejects.toThrow("handler failed");
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  test("Redis read failure → logs warning, executes handler", async () => {
    mockRedisGet.mockRejectedValueOnce(new Error("Redis down"));
    const handler = async () => ({ id: 42 });
    const wrapped = idempotent("test.path", handler);

    const result = await wrapped(opts);

    expect(result).toEqual({ id: 42 });
  });

  test("Redis write failure → logs warning, still returns result", async () => {
    mockRedisSet.mockRejectedValueOnce(new Error("Redis down"));
    const handler = async () => ({ id: 42 });
    const wrapped = idempotent("test.path", handler);

    const result = await wrapped(opts);

    expect(result).toEqual({ id: 42 });
  });

  test("correct cache key format: idem:user:{userId}:{path}:{key}", async () => {
    const handler = async () => "ok";
    const wrapped = idempotent("messages.send", handler);
    const key = "11111111-2222-3333-4444-555555555555";

    await wrapped({ ctx: { userId: 7 }, input: { idempotencyKey: key } });

    expect(mockRedisGet).toHaveBeenCalledWith(`idem:user:7:messages.send:${key}`);
  });
});
