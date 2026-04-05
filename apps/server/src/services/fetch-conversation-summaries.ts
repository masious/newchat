import { Attachment, type Database, sql } from "@newchat/db";
import { ConversationSummary } from "../trpc/types";

export type ConversationRow = {
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
