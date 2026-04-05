import type { Database, Attachment } from "@newchat/db";
import { BadRequestError } from "../errors";
import { ensureConversationMember } from "./authorization";
import {
  listMessages as listMessagesQuery,
  insertMessage,
  upsertReadReceipts,
  validateMessageIds,
  fetchMessageWithSender,
} from "../data/message-queries";
import { getConversationMemberUserIds } from "../data/conversation-queries";
import { publishConversationEvent } from "./realtime-events";
import { notifyUserOfMessage } from "./notification-service";

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
    cursor: input.cursor,
    limit,
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, -1) : rows;
  const nextCursor =
    hasMore && items.length ? items[items.length - 1].id : undefined;

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
  const conversation = await ensureConversationMember(
    db,
    input.conversationId,
    input.senderId,
  );

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
    await publishConversationEvent(input.conversationId, {
      type: "new_message",
      conversationId: input.conversationId,
      message,
    });

    const memberUserIds = await getConversationMemberUserIds(
      db,
      input.conversationId,
    );

    const notificationPromises = memberUserIds
      .filter((id) => id !== input.senderId)
      .map((recipientUserId) =>
        notifyUserOfMessage(db, {
          recipientUserId,
          senderName: message.sender!.firstName,
          content: input.content || "[Attachment]",
          conversationId: input.conversationId,
          conversationName:
            conversation.type === "group"
              ? conversation.name ?? undefined
              : undefined,
        }),
      );

    Promise.allSettled(notificationPromises).catch(console.error);
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

  await publishConversationEvent(input.conversationId, {
    type: "message_read",
    conversationId: input.conversationId,
    messageIds: input.messageIds,
    userId: input.userId,
  });

  return { success: true };
}

export async function typing(
  db: Database,
  input: { conversationId: number; userId: number },
) {
  await ensureConversationMember(db, input.conversationId, input.userId);
  await publishConversationEvent(input.conversationId, {
    type: "typing",
    conversationId: input.conversationId,
    userId: input.userId,
  });
  return { success: true };
}
