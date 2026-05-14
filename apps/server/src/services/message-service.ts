import type { Attachment, Database } from "@newchat/db";
import {
  fetchMessageWithSender,
  insertMessage,
  listMessages as listMessagesQuery,
  upsertReadReceipts,
  validateMessageIds,
} from "../data/message-queries";
import { BadRequestError } from "../errors";
import { domainEvents } from "../events";
import { ensureConversationMember } from "./authorization";

export async function list(
  db: Database,
  input: {
    conversationId: number;
    senderId: number;
    cursor?: number;
    limit?: number;
  },
) {
  await ensureConversationMember(db, input.conversationId, input.senderId);

  const limit = input.limit ?? 25;
  const rows = await listMessagesQuery(db, {
    conversationId: input.conversationId,
    userId: input.senderId,
    cursor: input.cursor,
    limit,
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, -1) : rows;
  const nextCursor = hasMore && items.length ? items[items.length - 1].id : undefined;

  return { messages: items, nextCursor };
}

export async function send(
  db: Database,
  input: {
    conversationId: number;
    senderId: number;
    content: string;
    attachments?: Attachment[];
  },
) {
  const conversation = await ensureConversationMember(db, input.conversationId, input.senderId);

  const created = await insertMessage(db, {
    conversationId: input.conversationId,
    senderId: input.senderId,
    content: input.content,
    attachments: input.attachments?.length ? input.attachments : null,
  });

  await upsertReadReceipts(db, {
    messageIds: [created.id],
    userId: input.senderId,
  });

  const message = await fetchMessageWithSender(db, created.id);
  if (message) {
    await domainEvents.emit("message.sent", {
      message,
      conversationId: input.conversationId,
      senderId: input.senderId,
      conversationType: conversation.type,
      conversationName: conversation.name,
    });
  }

  return { message };
}

export async function markRead(
  db: Database,
  input: {
    conversationId: number;
    userId: number;
    messageIds: number[];
  },
) {
  await ensureConversationMember(db, input.conversationId, input.userId);

  const validMessages = await validateMessageIds(db, {
    messageIds: input.messageIds,
    conversationId: input.conversationId,
  });
  if (validMessages.length !== input.messageIds.length) {
    throw new BadRequestError("Invalid messageIds");
  }

  await upsertReadReceipts(db, {
    messageIds: input.messageIds,
    userId: input.userId,
  });

  await domainEvents.emit("message.read", {
    conversationId: input.conversationId,
    messageIds: input.messageIds,
    userId: input.userId,
  });

  return { success: true };
}

export async function typing(db: Database, input: { conversationId: number; userId: number }) {
  await ensureConversationMember(db, input.conversationId, input.userId);
  await domainEvents.emit("message.typing", {
    conversationId: input.conversationId,
    userId: input.userId,
  });
  return { success: true };
}
