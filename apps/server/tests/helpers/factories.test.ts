// Test data factories for creating typed objects matching DB schema shapes.
// Each factory returns a fully populated object with sensible defaults.
// Use `overrides` to customize specific fields per test.

import type { Attachment } from "@newchat/db";
import type {
  Member,
  ConversationSummary,
} from "@/types/domain";
import { AuthTokenRow, PushSubscriptionRow, UserRow } from "./types";

// ---------------------------------------------------------------------------
// Counters — ensure unique IDs across a test file without coordination
// ---------------------------------------------------------------------------
let userCounter = 0;
let conversationCounter = 0;
let messageCounter = 0;
let authTokenCounter = 0;
let pushSubscriptionCounter = 0;

export function resetFactoryCounters() {
  userCounter = 0;
  conversationCounter = 0;
  messageCounter = 0;
  authTokenCounter = 0;
  pushSubscriptionCounter = 0;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function createTestUser(overrides?: Partial<UserRow>): UserRow {
  const n = ++userCounter;
  return {
    id: n,
    telegramId: `tg_${n}`,
    username: `user${n}`,
    firstName: `User`,
    lastName: `${n}`,
    avatarUrl: null,
    hasCompletedOnboarding: false,
    notificationChannel: "both",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    lastSeenAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------
type ConversationRow = {
  id: number;
  type: "dm" | "group";
  name: string | null;
  createdBy: number | null;
  createdAt: Date;
};

export function createTestConversation(
  overrides?: Partial<ConversationRow>,
): ConversationRow {
  const n = ++conversationCounter;
  return {
    id: n,
    type: "dm",
    name: null,
    createdBy: null,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
type MessageRow = {
  id: number;
  conversationId: number;
  senderId: number | null;
  content: string;
  attachments: Attachment[] | null;
  createdAt: Date;
};

export function createTestMessage(overrides?: Partial<MessageRow>): MessageRow {
  const n = ++messageCounter;
  return {
    id: n,
    conversationId: 1,
    senderId: 1,
    content: `Test message ${n}`,
    attachments: null,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Auth Tokens
// ---------------------------------------------------------------------------
export function createTestAuthToken(
  overrides?: Partial<AuthTokenRow>,
): AuthTokenRow {
  const n = ++authTokenCounter;
  return {
    id: n,
    token: `test-token-${"a".repeat(22)}-${String(n).padStart(4, "0")}`,
    telegramId: null,
    status: "pending",
    userId: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Push Subscriptions
// ---------------------------------------------------------------------------

export function createTestPushSubscription(
  overrides?: Partial<PushSubscriptionRow>,
): PushSubscriptionRow {
  const n = ++pushSubscriptionCounter;
  return {
    id: n,
    userId: 1,
    endpoint: `https://push.example.com/sub/${n}`,
    p256dh: `test-p256dh-${n}`,
    auth: `test-auth-${n}`,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Domain types (for service-layer tests)
// ---------------------------------------------------------------------------

export function createTestMessageWithSender(
  overrides?: Record<string, unknown>,
) {
  const n = ++messageCounter;
  const senderN = ++userCounter;
  return {
    id: n,
    conversationId: 1,
    content: `Test message ${n}`,
    attachments: null,
    createdAt: new Date("2025-01-01"),
    sender: {
      id: senderN,
      username: `user${senderN}`,
      firstName: "User",
      avatarUrl: null,
    },
    ...overrides,
  };
}

export function createTestMember(overrides?: Partial<Member>): Member {
  const n = ++userCounter;
  return {
    id: n,
    username: `user${n}`,
    firstName: `User`,
    lastName: `${n}`,
    avatarUrl: null,
    ...overrides,
  };
}

export function createTestConversationSummary(
  overrides?: Partial<ConversationSummary>,
): ConversationSummary {
  const n = ++conversationCounter;
  return {
    id: n,
    type: "dm",
    name: null,
    createdBy: null,
    createdAt: new Date("2025-01-01"),
    lastMessage: null,
    unreadCount: 0,
    members: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export function createTestAttachment(
  overrides?: Partial<Attachment>,
): Attachment {
  return {
    url: "https://test.r2.dev/uploads/test-file.jpg",
    name: "test-file.jpg",
    type: "image/jpeg",
    size: 1024,
    ...overrides,
  };
}
