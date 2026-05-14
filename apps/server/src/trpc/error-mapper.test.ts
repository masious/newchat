import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";
import { mapDomainError } from "./error-mapper";

describe("mapDomainError", () => {
  test("maps ForbiddenError to FORBIDDEN", () => {
    try {
      mapDomainError(new ForbiddenError("no access"));
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
      expect((err as TRPCError).message).toBe("no access");
    }
  });

  test("maps NotFoundError to NOT_FOUND", () => {
    try {
      mapDomainError(new NotFoundError("missing"));
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("NOT_FOUND");
      expect((err as TRPCError).message).toBe("missing");
    }
  });

  test("maps BadRequestError to BAD_REQUEST", () => {
    try {
      mapDomainError(new BadRequestError("invalid input"));
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("BAD_REQUEST");
      expect((err as TRPCError).message).toBe("invalid input");
    }
  });

  test("maps UnauthorizedError to UNAUTHORIZED", () => {
    try {
      mapDomainError(new UnauthorizedError("bad token"));
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("UNAUTHORIZED");
      expect((err as TRPCError).message).toBe("bad token");
    }
  });

  test("rethrows non-domain errors unchanged", () => {
    const original = new Error("something else");
    try {
      mapDomainError(original);
    } catch (err) {
      expect(err).toBe(original);
      expect(err).not.toBeInstanceOf(TRPCError);
    }
  });
});
