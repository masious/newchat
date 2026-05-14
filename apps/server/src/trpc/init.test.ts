import { beforeEach, describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";
import { mockRedisIncr, mockVerifyToken, resetAllMocks } from "../../tests/helpers/module-mocks";
import { protectedProcedure, publicProcedure, router } from "./init";

// Minimal test router to exercise middleware
const testRouter = router({
  publicQuery: publicProcedure.query(() => "public-ok"),
  protectedQuery: protectedProcedure.query(({ ctx }) => ({
    userId: ctx.userId,
  })),
});

function createContext(overrides?: { token?: string; ip?: string; userId?: number }) {
  return {
    db: {} as any,
    ip: overrides?.ip ?? "127.0.0.1",
    token: overrides?.token,
    userId: overrides?.userId,
  };
}

beforeEach(() => {
  resetAllMocks();
});

describe("enforceUser middleware", () => {
  test("extracts userId from valid token", async () => {
    mockVerifyToken.mockReturnValueOnce(42);
    const caller = testRouter.createCaller(createContext({ token: "valid" }));

    const result = await caller.protectedQuery();

    expect(result.userId).toBe(42);
  });

  test("throws UNAUTHORIZED when token is missing", async () => {
    const caller = testRouter.createCaller(createContext());

    try {
      await caller.protectedQuery();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  test("throws UNAUTHORIZED when token is invalid/expired", async () => {
    // mockVerifyToken defaults to returning null
    const caller = testRouter.createCaller(createContext({ token: "bad" }));

    try {
      await caller.protectedQuery();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });
});

describe("rateLimit middleware", () => {
  test("allows requests under the limit", async () => {
    const caller = testRouter.createCaller(createContext());

    const result = await caller.publicQuery();

    expect(result).toBe("public-ok");
  });

  test("throws TOO_MANY_REQUESTS when over limit", async () => {
    // incr returns a count above any configured limit
    mockRedisIncr.mockResolvedValueOnce(9999);
    const caller = testRouter.createCaller(createContext());

    try {
      await caller.publicQuery();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("TOO_MANY_REQUESTS");
    }
  });

  test("uses userId when authed, IP when not", async () => {
    // Authed request — incr should be called with user:42 in the key
    mockVerifyToken.mockReturnValueOnce(42);
    const authedCaller = testRouter.createCaller(createContext({ token: "valid", ip: "10.0.0.1" }));
    await authedCaller.protectedQuery();
    const authedKey = mockRedisIncr.mock.calls[0]?.[0] as string;
    expect(authedKey).toContain("user:42");

    resetAllMocks();

    // Unauthed request — incr should be called with ip:10.0.0.1 in the key
    const publicCaller = testRouter.createCaller(createContext({ ip: "10.0.0.1" }));
    await publicCaller.publicQuery();
    const publicKey = mockRedisIncr.mock.calls[0]?.[0] as string;
    expect(publicKey).toContain("ip:10.0.0.1");
  });
});
