import {
  type Database,
  users,
  and,
  eq,
  ne,
  ilike,
  inArray,
  or,
} from "@newchat/db";

export async function findUserById(db: Database, userId: number) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export async function updateUser(
  db: Database,
  userId: number,
  fields: {
    username: string;
    firstName: string;
    avatarUrl: string | null;
    hasCompletedOnboarding?: boolean;
  },
) {
  const [updated] = await db
    .update(users)
    .set({
      ...fields,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}

export async function searchUsers(
  db: Database,
  input: { query: string; limit: number; excludeUserId?: number },
) {
  const escaped = input.query.replace(/[%_\\]/g, "\\$&");
  const term = `%${escaped}%`;
  return db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(
      and(
        ...(input.excludeUserId ? [ne(users.id, input.excludeUserId)] : []),
        or(
          ilike(users.username, term),
          ilike(users.firstName, term),
          ilike(users.lastName, term),
        ),
      ),
    )
    .limit(input.limit);
}

export async function findUsersByIds(db: Database, userIds: number[]) {
  if (!userIds.length) return [];
  return db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, userIds));
}

export async function updateNotificationChannel(
  db: Database,
  userId: number,
  channel: "web" | "telegram" | "both" | "none",
) {
  const [updated] = await db
    .update(users)
    .set({
      notificationChannel: channel,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}
