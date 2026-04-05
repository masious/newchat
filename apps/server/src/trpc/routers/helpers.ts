import { TRPCError } from "@trpc/server";
import {
  users,
  conversationMembers,
  type Database,
  and,
  eq,
  inArray,
} from "@newchat/db";

export async function ensureConversationMember(
  db: Database,
  conversationId: number,
  userId: number,
) {
  const membership = await db.query.conversationMembers.findFirst({
    where: and(
      eq(conversationMembers.conversationId, conversationId),
      eq(conversationMembers.userId, userId),
    ),
    with: {
      conversation: true,
    },
  });
  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return membership.conversation;
}

export async function ensureUsersExist(db: Database, memberIds: number[]) {
  if (!memberIds.length) return;
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, memberIds));
  if (rows.length !== memberIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more users do not exist",
    });
  }
}
