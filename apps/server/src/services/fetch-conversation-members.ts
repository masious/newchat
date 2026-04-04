import { conversationMembers, Database, users } from "@newchat/db";
import { eq } from "drizzle-orm/sql/expressions/conditions";
import { asc } from "drizzle-orm/sql/expressions/select";

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
