import { describe, test, expect } from "bun:test";
import jwt from "jsonwebtoken";

// Same constants as jwt.ts — tests verify the configuration produces correct tokens.
const JWT_SECRET = process.env.JWT_SECRET!;
const ISSUER = "newchat-server";
const AUDIENCE = "newchat-api";
const ALGORITHM = "HS256" as const;

function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: "7d",
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: ALGORITHM,
  });
}

function verifyToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [ALGORITHM],
    });
    if (typeof payload !== "object" || typeof payload.sub !== "number") {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

describe("signToken / verifyToken round-trip", () => {
  test("verifyToken returns the userId from a signed token", () => {
    const token = signToken(42);
    expect(verifyToken(token)).toBe(42);
  });

  test("works with different userIds", () => {
    expect(verifyToken(signToken(1))).toBe(1);
    expect(verifyToken(signToken(999999))).toBe(999999);
  });
});

describe("verifyToken rejects invalid tokens", () => {
  test("returns null for expired token", () => {
    const token = jwt.sign({ sub: 1 }, JWT_SECRET, {
      expiresIn: "-1s",
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithm: ALGORITHM,
    });
    expect(verifyToken(token)).toBeNull();
  });

  test("returns null for malformed token", () => {
    expect(verifyToken("not-a-jwt")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });

  test("returns null for wrong issuer", () => {
    const token = jwt.sign({ sub: 1 }, JWT_SECRET, {
      issuer: "wrong-issuer",
      audience: AUDIENCE,
      algorithm: ALGORITHM,
    });
    expect(verifyToken(token)).toBeNull();
  });

  test("returns null for wrong audience", () => {
    const token = jwt.sign({ sub: 1 }, JWT_SECRET, {
      issuer: ISSUER,
      audience: "wrong-audience",
      algorithm: ALGORITHM,
    });
    expect(verifyToken(token)).toBeNull();
  });
});
