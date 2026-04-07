import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  primaryKey,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const conversationTypeEnum = pgEnum("conversation_type", [
  "dm",
  "group",
]);
export const authTokenStatusEnum = pgEnum("auth_token_status", [
  "pending",
  "confirmed",
  "expired",
]);
export const notificationChannelEnum = pgEnum("notification_channel", [
  "web",
  "telegram",
  "both",
  "none",
]);

// Users
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  telegramId: varchar("telegram_id", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false).notNull(),
  notificationChannel: notificationChannelEnum("notification_channel").default("both").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at"),
});

export const usersRelations = relations(users, ({ many }) => ({
  conversationMembers: many(conversationMembers),
  messages: many(messages),
  authTokens: many(authTokens),
  pushSubscriptions: many(pushSubscriptions),
}));

// Auth Tokens
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    telegramId: varchar("telegram_id", { length: 64 }),
    status: authTokenStatusEnum("status").default("pending").notNull(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("auth_tokens_status_created_at_idx").on(t.status, t.createdAt),
    index("auth_tokens_user_id_idx").on(t.userId),
  ],
);

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, { fields: [authTokens.userId], references: [users.id] }),
}));

// Conversations
export const conversations = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  type: conversationTypeEnum("type").notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationsRelations = relations(conversations, ({ many }) => ({
  members: many(conversationMembers),
  messages: many(messages),
}));

// Conversation Members
export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index("conversation_members_user_id_idx").on(t.userId, t.conversationId),
  ],
);

export const conversationMembersRelations = relations(
  conversationMembers,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationMembers.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationMembers.userId],
      references: [users.id],
    }),
  }),
);

// Attachment type for messages
export type Attachment = {
  url: string;
  name: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
};

// Messages
export const messages = pgTable(
  "messages",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: integer("sender_id").references(() => users.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    attachments: jsonb("attachments").$type<Attachment[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("messages_conversation_id_created_at_idx").on(
      t.conversationId,
      t.createdAt.desc(),
    ),
    index("messages_sender_id_idx").on(t.senderId),
  ],
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  readReceipts: many(readReceipts),
}));

// Read Receipts
export const readReceipts = pgTable(
  "read_receipts",
  {
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);

export const readReceiptsRelations = relations(readReceipts, ({ one }) => ({
  message: one(messages, {
    fields: [readReceipts.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [readReceipts.userId],
    references: [users.id],
  }),
}));

// Push Subscriptions
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("push_subscriptions_user_id_endpoint_unique").on(t.userId, t.endpoint)],
);

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [pushSubscriptions.userId],
      references: [users.id],
    }),
  }),
);
