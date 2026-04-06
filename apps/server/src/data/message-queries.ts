import {
  type Database,
  type Attachment,
  users,
  messages,
  readReceipts,
  and,
  desc,
  eq,
  inArray,
  lt,
  sql,
} from "@newchat/db";

export async function listMessages(
  db: Database,
  input: { conversationId: number; userId: number; cursor?: number; limit: number },
) {
  const conditions = [eq(messages.conversationId, input.conversationId)];
  if (input.cursor) {
    conditions.push(lt(messages.id, input.cursor));
  }
  const whereClause =
    conditions.length > 1 ? and(...conditions) : conditions[0];

  return db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      content: messages.content,
      attachments: messages.attachments,
      createdAt: messages.createdAt,
      sender: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        avatarUrl: users.avatarUrl,
      },
      readByMe: sql<boolean>`${readReceipts.readAt} is not null`.as("read_by_me"),
      readByOthers: sql<boolean>`exists (
        select 1 from read_receipts rr2
        where rr2.message_id = ${messages.id}
        and rr2.user_id != ${messages.senderId}
      )`.as("read_by_others"),
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.senderId))
    .leftJoin(
      readReceipts,
      and(
        eq(readReceipts.messageId, messages.id),
        eq(readReceipts.userId, input.userId),
      ),
    )
    .where(whereClause)
    .orderBy(desc(messages.createdAt))
    .limit(input.limit + 1);
}

export async function insertMessage(
  db: Database,
  input: {
    conversationId: number;
    senderId: number;
    content: string;
    attachments: Attachment[] | null;
  },
) {
  const [created] = await db
    .insert(messages)
    .values({
      conversationId: input.conversationId,
      senderId: input.senderId,
      content: input.content,
      attachments: input.attachments?.length ? input.attachments : null,
    })
    .returning({ id: messages.id });
  return created;
}

export async function upsertReadReceipts(
  db: Database,
  input: { messageIds: number[]; userId: number },
) {
  const now = new Date();
  await db
    .insert(readReceipts)
    .values(
      input.messageIds.map((messageId) => ({
        messageId,
        userId: input.userId,
        readAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: [readReceipts.messageId, readReceipts.userId],
      set: { readAt: now },
    });
}

export async function validateMessageIds(
  db: Database,
  input: { messageIds: number[]; conversationId: number },
) {
  const rows = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        inArray(messages.id, input.messageIds),
        eq(messages.conversationId, input.conversationId),
      ),
    );
  return rows;
}

export async function fetchMessageWithSender(
  db: Database,
  messageId: number,
) {
  const [row] = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      content: messages.content,
      attachments: messages.attachments,
      createdAt: messages.createdAt,
      sender: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.senderId))
    .where(eq(messages.id, messageId))
    .limit(1);
  return row ?? null;
}
