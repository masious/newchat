import type { Database } from "@newchat/db";
import { BadRequestError } from "../errors";
import {
  ensureConversationMember,
  ensureGroupOwner,
  ensureUsersExist,
} from "./authorization";
import {
  fetchConversationSummaries,
  fetchConversationSummary,
  findExistingDm,
  createConversationWithMembers,
  getConversationMembers,
  getConversationMemberUserIds,
  updateConversationName,
  addConversationMember,
  removeConversationMember,
} from "../data/conversation-queries";
import {
  publishMembershipChange,
  publishConversationEvent,
} from "./realtime-events";

export async function list(db: Database, input: { userId: number }) {
  const conversations = await fetchConversationSummaries(db, input.userId);
  return { conversations };
}

export async function create(
  db: Database,
  input: {
    creatorId: number;
    type: "dm" | "group";
    memberUserIds: number[];
    name?: string;
  },
) {
  const sanitizedMemberIds = input.memberUserIds.filter(
    (id) => id !== input.creatorId,
  );
  const memberIds = Array.from(
    new Set<number>([...sanitizedMemberIds, input.creatorId]),
  );

  await ensureUsersExist(db, memberIds);

  if (input.type === "dm") {
    if (memberIds.length !== 2) {
      throw new BadRequestError(
        "DM conversations must include exactly two members",
      );
    }
    const otherId = memberIds.find((id) => id !== input.creatorId)!;
    const existingId = await findExistingDm(db, input.creatorId, otherId);
    if (existingId) {
      const conversation = await fetchConversationSummary(
        db,
        input.creatorId,
        existingId,
      );
      return { conversation };
    }
  } else if (!input.name) {
    throw new BadRequestError("Group conversations require a name");
  } else if (memberIds.length < 2) {
    throw new BadRequestError("Groups must include at least two members");
  }

  const conversationId = await createConversationWithMembers(db, {
    type: input.type,
    name: input.type === "group" ? input.name ?? null : null,
    createdBy: input.type === "group" ? input.creatorId : null,
    memberIds,
  });

  const currentSummary = await fetchConversationSummary(
    db,
    input.creatorId,
    conversationId,
  );
  if (!currentSummary) {
    throw new BadRequestError("Conversation summary unavailable");
  }

  for (const memberId of memberIds) {
    const summary =
      memberId === input.creatorId
        ? currentSummary
        : await fetchConversationSummary(db, memberId, conversationId);
    if (!summary) continue;
    await publishMembershipChange(memberId, {
      type: "join",
      conversationId,
      conversation: summary,
    });
  }

  return { conversation: currentSummary };
}

export async function getMembers(
  db: Database,
  input: { conversationId: number; userId: number },
) {
  await ensureConversationMember(db, input.conversationId, input.userId);
  const members = await getConversationMembers(db, input.conversationId);
  return { members };
}

export async function updateName(
  db: Database,
  input: { conversationId: number; userId: number; name: string },
) {
  await ensureGroupOwner(db, input.conversationId, input.userId);
  await updateConversationName(db, input.conversationId, input.name);
  await publishConversationEvent(input.conversationId, {
    type: "conversation_updated",
    conversationId: input.conversationId,
    name: input.name,
  });
  return { success: true };
}

export async function addMember(
  db: Database,
  input: { conversationId: number; userId: number; memberUserId: number },
) {
  await ensureGroupOwner(db, input.conversationId, input.userId);
  await ensureUsersExist(db, [input.memberUserId]);

  const existingMemberIds = await getConversationMemberUserIds(
    db,
    input.conversationId,
  );
  if (existingMemberIds.includes(input.memberUserId)) {
    throw new BadRequestError("User is already a member of this conversation");
  }

  await addConversationMember(db, input.conversationId, input.memberUserId);

  const summary = await fetchConversationSummary(
    db,
    input.memberUserId,
    input.conversationId,
  );
  if (summary) {
    await publishMembershipChange(input.memberUserId, {
      type: "join",
      conversationId: input.conversationId,
      conversation: summary,
    });
  }

  await publishConversationEvent(input.conversationId, {
    type: "member_added",
    conversationId: input.conversationId,
    userId: input.memberUserId,
  });

  return { success: true };
}

export async function removeMember(
  db: Database,
  input: { conversationId: number; userId: number; memberUserId: number },
) {
  const conversation = await ensureGroupOwner(
    db,
    input.conversationId,
    input.userId,
  );
  if (
    conversation.createdBy !== null &&
    input.memberUserId === conversation.createdBy
  ) {
    throw new BadRequestError("Cannot remove the group owner");
  }

  await removeConversationMember(db, input.conversationId, input.memberUserId);

  await publishConversationEvent(input.conversationId, {
    type: "member_removed",
    conversationId: input.conversationId,
    userId: input.memberUserId,
  });

  await publishMembershipChange(input.memberUserId, {
    type: "leave",
    conversationId: input.conversationId,
  });

  return { success: true };
}
