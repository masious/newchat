import { describe, test, expect, beforeEach } from "bun:test";
import { createTestAuthToken } from "../../tests/helpers/factories.test";
import {
  resetAllMocks,
  mockInsertAuthToken,
  mockFindAuthToken,
  mockExpireAuthToken,
  mockExchangeConfirmedToken,
  mockSignToken,
  mockRedisGet,
  mockRedisSet,
} from "../../tests/helpers/module-mocks";
import { UnauthorizedError } from "../errors";
import { TOKEN_TTL_MS } from "../lib/constants";

import * as authService from "./auth-service";

beforeEach(() => {
  resetAllMocks();
});

describe("createToken", () => {
  test("generates token and inserts to DB", async () => {
    const result = await authService.createToken({} as any);
    expect(result.token).toBeString();
    expect(result.token).toHaveLength(32);
    expect(result.expiresAt).toBeString();
    expect(mockInsertAuthToken).toHaveBeenCalledWith(expect.anything(), result.token);
  });

  test("expiresAt is in the future", async () => {
    const before = Date.now();
    const result = await authService.createToken({} as any);
    const expiresAt = new Date(result.expiresAt).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + TOKEN_TTL_MS - 100);
  });
});

describe("pollToken", () => {
  test("returns pending status", async () => {
    mockFindAuthToken.mockResolvedValueOnce(
      createTestAuthToken({ status: "pending", createdAt: new Date() }),
    );
    const result = await authService.pollToken({} as any, "token");
    expect(result.status).toBe("pending");
  });

  test("returns confirmed status", async () => {
    mockFindAuthToken.mockResolvedValueOnce(
      createTestAuthToken({ status: "confirmed" }),
    );
    const result = await authService.pollToken({} as any, "token");
    expect(result.status).toBe("confirmed");
  });

  test("returns expired when token not found", async () => {
    const result = await authService.pollToken({} as any, "token");
    expect(result.status).toBe("expired");
  });

  test("expires old pending tokens", async () => {
    const oldDate = new Date(Date.now() - TOKEN_TTL_MS - 1000);
    mockFindAuthToken.mockResolvedValueOnce(
      createTestAuthToken({ id: 5, status: "pending", createdAt: oldDate }),
    );

    const result = await authService.pollToken({} as any, "token");

    expect(result.status).toBe("expired");
    expect(mockExpireAuthToken).toHaveBeenCalledWith(expect.anything(), 5);
  });
});

describe("exchange", () => {
  test("returns JWT for confirmed token", async () => {
    mockExchangeConfirmedToken.mockResolvedValueOnce({ id: 42 });
    mockSignToken.mockReturnValueOnce("real-jwt");

    const result = await authService.exchange({} as any, "token");

    expect(result.token).toBe("real-jwt");
    expect(mockSignToken).toHaveBeenCalledWith(42);
  });

  test("caches JWT in Redis", async () => {
    mockExchangeConfirmedToken.mockResolvedValueOnce({ id: 42 });

    await authService.exchange({} as any, "token");

    expect(mockRedisSet).toHaveBeenCalledWith(
      "auth:exchange:token",
      expect.any(String),
      "EX",
      expect.any(Number),
    );
  });

  test("returns cached JWT on retry", async () => {
    mockRedisGet.mockResolvedValueOnce("cached-jwt");

    const result = await authService.exchange({} as any, "token");

    expect(result.token).toBe("cached-jwt");
    expect(mockExchangeConfirmedToken).not.toHaveBeenCalled();
  });

  test("throws UnauthorizedError for invalid token", async () => {
    await expect(
      authService.exchange({} as any, "bad-token"),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test("degrades gracefully on Redis read failure", async () => {
    mockRedisGet.mockRejectedValueOnce(new Error("Redis down"));
    mockExchangeConfirmedToken.mockResolvedValueOnce({ id: 42 });

    const result = await authService.exchange({} as any, "token");
    expect(result.token).toBe("mock-jwt-token");
  });

  test("degrades gracefully on Redis write failure", async () => {
    mockExchangeConfirmedToken.mockResolvedValueOnce({ id: 42 });
    mockRedisSet.mockRejectedValueOnce(new Error("Redis down"));

    const result = await authService.exchange({} as any, "token");
    expect(result.token).toBe("mock-jwt-token");
  });
});
