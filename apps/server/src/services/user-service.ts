import type { Database } from "@newchat/db";
import { NotFoundError, ForbiddenError } from "../errors";
import {
  findUserById,
  updateUser as updateUserQuery,
  searchUsers as searchUsersQuery,
  updateNotificationChannel,
} from "../data/user-queries";
import { getPresenceStatus } from "../lib/presence";

export async function getMe(db: Database, userId: number) {
  const user = await findUserById(db, userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return { user };
}

export async function update(
  db: Database,
  userId: number,
  input: {
    username: string;
    displayName: string;
    avatar?: string;
    isPublic?: boolean;
  },
) {
  const updated = await updateUserQuery(db, userId, {
    username: input.username,
    firstName: input.displayName,
    avatarUrl: input.avatar ?? null,
    isPublic: input.isPublic ?? true,
  });
  if (!updated) {
    throw new NotFoundError("User not found");
  }
  return { user: updated };
}

export async function search(
  db: Database,
  input: { query: string; limit?: number; excludeUserId?: number },
) {
  const limit = input.limit ?? 10;
  const rows = await searchUsersQuery(db, {
    query: input.query,
    limit,
    excludeUserId: input.excludeUserId,
  });

  const enriched = await Promise.all(
    rows.map(async (user) => ({
      ...user,
      presence: await getPresenceStatus(user.id),
    })),
  );

  return { users: enriched };
}

export async function getProfile(
  db: Database,
  input: { targetUserId: number; requesterId: number },
) {
  const user = await findUserById(db, input.targetUserId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  if (!user.isPublic && user.id !== input.requesterId) {
    throw new ForbiddenError("Profile is private");
  }

  const presence = await getPresenceStatus(user.id);
  return { user: { ...user, presence } };
}

export async function getPresenceBatch(userIds: number[]) {
  const entries = await Promise.all(
    userIds.map(async (id) => ({
      userId: id,
      presence: await getPresenceStatus(id),
    })),
  );
  return { entries };
}

export async function updateNotificationPreferences(
  db: Database,
  userId: number,
  channel: "web" | "telegram" | "both" | "none",
) {
  const updated = await updateNotificationChannel(db, userId, channel);
  if (!updated) {
    throw new NotFoundError("User not found");
  }
  return { user: updated };
}
