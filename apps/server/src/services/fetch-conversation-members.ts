import { conversationMembers, Database, users, eq, asc } from "@newchat/db";

export async function fetchConversationMembers(
  db: Database,
  conversationId: number,
) {
  return db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      isPublic: users.isPublic,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(eq(conversationMembers.conversationId, conversationId))
    .orderBy(asc(users.firstName));
}
