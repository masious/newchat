import {
  type Database,
  conversationMembers,
  and,
  eq,
} from "@newchat/db";
import { ForbiddenError, BadRequestError } from "../errors";
import { findUsersByIds } from "../data/user-queries";

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
    throw new ForbiddenError("Not a conversation member");
  }
  return membership.conversation;
}

export async function ensureGroupOwner(
  db: Database,
  conversationId: number,
  userId: number,
) {
  const conversation = await ensureConversationMember(
    db,
    conversationId,
    userId,
  );
  if (conversation.type !== "group") {
    throw new ForbiddenError("Not a group conversation");
  }
  if (conversation.createdBy !== null && conversation.createdBy !== userId) {
    throw new ForbiddenError("Not the group owner");
  }
  return conversation;
}

export async function ensureUsersExist(db: Database, memberIds: number[]) {
  if (!memberIds.length) return;
  const rows = await findUsersByIds(db, memberIds);
  if (rows.length !== memberIds.length) {
    throw new BadRequestError("One or more users do not exist");
  }
}
