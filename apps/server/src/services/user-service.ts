import type { Database } from "@newchat/db";
import { NotFoundError, BadRequestError } from "../errors";
import {
  findUserById,
  updateUser as updateUserQuery,
  searchUsers as searchUsersQuery,
  updateNotificationChannel,
} from "../data/user-queries";
import { getPresenceStatus } from "../lib/presence";
import { uploadTelegramAvatarToR2 } from "../lib/telegram-avatar";

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
    completeOnboarding?: boolean;
  },
) {
  let updated;
  try {
    updated = await updateUserQuery(db, userId, {
      username: input.username,
      firstName: input.displayName,
      avatarUrl: input.avatar ?? null,
      ...(input.completeOnboarding && { hasCompletedOnboarding: true }),
    });
  } catch (err: unknown) {
    const dbErr = err as { code?: string; constraint?: string };
    if (dbErr.code === "23505" && dbErr.constraint?.includes("username")) {
      throw new BadRequestError("Username is already taken");
    }
    throw err;
  }
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
      presence: await getPresenceStatus(db, user.id),
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

  const presence = await getPresenceStatus(db, user.id);
  return { user: { ...user, presence } };
}

export async function fetchTelegramAvatar(db: Database, userId: number) {
  const user = await findUserById(db, userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  if (!user.telegramId) {
    throw new BadRequestError("User has no Telegram ID");
  }

  const avatarUrl = await uploadTelegramAvatarToR2(user.telegramId);
  return { avatarUrl };
}

export async function getPresenceBatch(db: Database, userIds: number[]) {
  const entries = await Promise.all(
    userIds.map(async (id) => ({
      userId: id,
      presence: await getPresenceStatus(db, id),
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
