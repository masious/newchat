// Raw SQL is used for fetchConversationSummaries because the query
// requires lateral joins and json_agg which aren't expressible via
// the Drizzle query builder without losing readability / performance.
import {
  type Database,
  Attachment,
  conversations,
  conversationMembers,
  users,
  sql,
  eq,
  asc,
} from "@newchat/db";
import type { ConversationSummary } from "../types/domain";

type ConversationRow = {
  id: number;
  type: "dm" | "group";
  name: string | null;
  created_at: Date;
  last_message_id: number | null;
  last_message_content: string | null;
  last_message_attachments: Attachment[] | null;
  last_message_created_at: Date | null;
  last_message_sender_id: number | null;
  unread_count: number | null;
  members: {
    id: number;
    username: string | null;
    firstName: string;
    lastName: string | null;
    avatarUrl: string | null;
  }[];
};

function mapConversationRow(row: ConversationRow): ConversationSummary {
  const lastMessage =
    row.last_message_id && row.last_message_created_at
      ? {
          id: row.last_message_id,
          conversationId: row.id,
          content: row.last_message_content ?? "",
          attachments: row.last_message_attachments ?? null,
          createdAt: row.last_message_created_at,
          senderId: row.last_message_sender_id,
        }
      : null;

  return {
    id: row.id,
    type: row.type,
    name: row.name,
    createdAt: row.created_at,
    lastMessage,
    isTyping: false,
    unreadCount: row.unread_count ?? 0,
    members: row.members,
  };
}

export async function fetchConversationSummaries(
  db: Database,
  userId: number,
  options: { conversationId?: number } = {},
) {
  const filter =
    options.conversationId !== undefined
      ? sql`AND c.id = ${options.conversationId}`
      : sql``;

  const result = await db.execute<ConversationRow>(sql`
    SELECT
      c.id,
      c.type,
      c.name,
      c.created_at,
      last_msg.id AS last_message_id,
      last_msg.content AS last_message_content,
      last_msg.attachments AS last_message_attachments,
      last_msg.created_at AS last_message_created_at,
      last_msg.sender_id AS last_message_sender_id,
      (
        SELECT json_agg(json_build_object(
        'id', u.id,
        'username', u.username,
        'firstName', u.first_name,
        'lastName', u.last_name,
        'avatarUrl', u.avatar_url
        ))
        FROM conversation_members cm_inner
        JOIN users u ON u.id = cm_inner.user_id
        WHERE cm_inner.conversation_id = c.id
    ) AS members,
      COALESCE(unread.count, 0)::int AS unread_count
    FROM conversations c
    JOIN conversation_members cm
      ON cm.conversation_id = c.id
      AND cm.user_id = ${userId}
    LEFT JOIN LATERAL (
      SELECT m.*
      FROM messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) last_msg ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS count
      FROM messages m2
      LEFT JOIN read_receipts rr
        ON rr.message_id = m2.id
       AND rr.user_id = ${userId}
      WHERE m2.conversation_id = c.id
        AND (rr.read_at IS NULL)
        AND m2.sender_id <> ${userId}
    ) unread ON TRUE
    WHERE 1 = 1
    ${filter}
    ORDER BY COALESCE(last_msg.created_at, c.created_at) DESC
  `);

  return result.rows.map(mapConversationRow);
}

export async function fetchConversationSummary(
  db: Database,
  userId: number,
  conversationId: number,
) {
  const [summary] = await fetchConversationSummaries(db, userId, {
    conversationId,
  });
  return summary;
}

export async function findExistingDm(
  db: Database,
  userIdA: number,
  userIdB: number,
) {
  const result = await db.execute<{ id: number }>(sql`
    SELECT c.id
    FROM conversations c
    JOIN conversation_members cm1
      ON cm1.conversation_id = c.id
     AND cm1.user_id = ${userIdA}
    JOIN conversation_members cm2
      ON cm2.conversation_id = c.id
     AND cm2.user_id = ${userIdB}
    WHERE c.type = 'dm'
    GROUP BY c.id
    HAVING COUNT(*) = 2
    LIMIT 1
  `);
  return result.rows[0]?.id ?? null;
}

export async function createConversationWithMembers(
  db: Database,
  input: {
    type: "dm" | "group";
    name: string | null;
    memberIds: number[];
  },
) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(conversations)
      .values({
        type: input.type,
        name: input.name,
      })
      .returning({ id: conversations.id });

    await tx.insert(conversationMembers).values(
      input.memberIds.map((memberId) => ({
        conversationId: created.id,
        userId: memberId,
      })),
    );

    return created.id;
  });
}

export async function getConversationMembers(
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
    })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(eq(conversationMembers.conversationId, conversationId))
    .orderBy(asc(users.firstName));
}

export async function getConversationMemberUserIds(
  db: Database,
  conversationId: number,
) {
  const rows = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversationId));
  return rows.map((r) => r.userId);
}
