import jwt from "jsonwebtoken";

const ISSUER = "newchat-server";
const AUDIENCE = "newchat-api";
const ALGORITHM = "HS256";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, getSecret(), {
    expiresIn: "7d",
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: ALGORITHM,
  });
}

/** Returns the userId or `null` if the token is invalid. */
export function verifyToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, getSecret(), {
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
