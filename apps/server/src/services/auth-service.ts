import { nanoid } from "nanoid";
import type { Database } from "@newchat/db";
import { UnauthorizedError } from "../errors";
import {
  insertAuthToken,
  findAuthToken,
  expireAuthToken,
  exchangeConfirmedToken,
} from "../data/auth-queries";
import { signToken } from "../lib/jwt";

const TOKEN_TTL_MS = 5 * 60 * 1000;

export async function createToken(db: Database) {
  const token = nanoid(32);
  await insertAuthToken(db, token);
  return {
    token,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  };
}

export async function pollToken(db: Database, token: string) {
  const record = await findAuthToken(db, token);
  if (!record) {
    return { status: "expired" as const };
  }

  if (record.status === "pending") {
    const cutoff = Date.now() - TOKEN_TTL_MS;
    if (record.createdAt && record.createdAt.getTime() < cutoff) {
      await expireAuthToken(db, record.id);
      return { status: "expired" as const };
    }
  }

  return { status: record.status };
}

export async function exchange(db: Database, token: string) {
  const record = await exchangeConfirmedToken(db, token);
  if (!record || !record.userId) {
    throw new UnauthorizedError("Invalid or expired token");
  }
  return { token: signToken(record.userId) };
}
