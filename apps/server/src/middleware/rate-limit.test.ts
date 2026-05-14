import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { mockRedisIncr, mockRedisTtl, resetAllMocks } from "../../tests/helpers/module-mocks";
import { createRateLimitMiddleware } from "./rate-limit";

function createApp() {
  const app = new Hono();
  app.use("/test", createRateLimitMiddleware({ limit: 5, windowSec: 60, prefix: "rl:test" }));
  app.get("/test", (c) => c.json({ ok: true }));
  return app;
}

beforeEach(() => {
  resetAllMocks();
});

describe("Hono rate limit middleware", () => {
  test("allows requests under the limit", async () => {
    const app = createApp();
    const res = await app.request("/test");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  test("returns 429 when over the limit", async () => {
    mockRedisIncr.mockResolvedValueOnce(6); // over limit of 5
    const app = createApp();
    const res = await app.request("/test");

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Too many requests");
  });

  test("sets X-RateLimit-* headers on success", async () => {
    mockRedisTtl.mockResolvedValueOnce(45);
    const app = createApp();
    const res = await app.request("/test");

    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("4");
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  test("sets Retry-After header on 429", async () => {
    mockRedisIncr.mockResolvedValueOnce(6);
    mockRedisTtl.mockResolvedValueOnce(30);
    const app = createApp();
    const res = await app.request("/test");

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
  });
});
