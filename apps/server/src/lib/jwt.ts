import jwt from "jsonwebtoken";
import { JWT_EXPIRY } from "./constants";

const ISSUER = "newchat-server";
const AUDIENCE = "newchat-api";
const ALGORITHM = "HS256";

// Validate at import time — crash on startup, not at request time.
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Required environment variable is not set: JWT_SECRET");
  return secret;
})();

export function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: ALGORITHM,
  });
}

/** Returns the userId or `null` if the token is invalid. */
export function verifyToken(token: string): number | null {
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
