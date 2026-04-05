import { users, messages, type Database, eq } from "@newchat/db";

export async function fetchMessageWithSender(db: Database, messageId: number) {
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
    .innerJoin(users, eq(users.id, messages.senderId))
    .where(eq(messages.id, messageId))
    .limit(1);
  return row ?? null;
}
