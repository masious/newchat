import type { Database } from "@newchat/db";
import { BadRequestError } from "../errors";
import { ensureConversationMember, ensureUsersExist } from "./authorization";
import {
  fetchConversationSummaries,
  fetchConversationSummary,
  findExistingDm,
  createConversationWithMembers,
  getConversationMembers,
} from "../data/conversation-queries";
import { publishMembershipChange } from "./realtime-events";

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
