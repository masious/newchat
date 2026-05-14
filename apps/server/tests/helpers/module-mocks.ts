// Centralized module mocks for all service unit tests.
//
// Bun's mock.module() is GLOBAL — calling it in one test file replaces
// the module for ALL files. This file is the single source of truth for
// all module-level mocks. Test files import the mock functions from here
// and configure return values per test via beforeEach/mockResolvedValueOnce.
//
// Path resolution: from tests/helpers/, ../../src/... resolves to src/...

import { mock } from "bun:test";
import type { ConversationSummary } from "@/types/domain";
import type { AuthTokenRow, IdRow, PushSubscriptionRow, UserRow } from "./types";

// ---------------------------------------------------------------------------
// Data: user-queries
// ---------------------------------------------------------------------------
export const mockFindUserById = mock(() => Promise.resolve(null as UserRow | null));
export const mockUpdateUser = mock(() => Promise.resolve(null as UserRow | null));
export const mockSearchUsers = mock(() => Promise.resolve([] as UserRow[]));
export const mockFindUsersByIds = mock((_db: any, _userIds: number[]) =>
  Promise.resolve([] as IdRow[]),
);
export const mockUpdateNotificationChannel = mock(() => Promise.resolve(null as UserRow | null));
export const mockUpdateLastSeen = mock(() => Promise.resolve());
export const mockGetLastSeenAt = mock(() => Promise.resolve(null as Date | null));

mock.module("../../src/data/user-queries", () => ({
  findUserById: mockFindUserById,
  updateUser: mockUpdateUser,
  searchUsers: mockSearchUsers,
  findUsersByIds: mockFindUsersByIds,
  updateNotificationChannel: mockUpdateNotificationChannel,
  updateLastSeen: mockUpdateLastSeen,
  getLastSeenAt: mockGetLastSeenAt,
}));

// ---------------------------------------------------------------------------
// Data: message-queries
// ---------------------------------------------------------------------------
export const mockListMessages = mock(() => Promise.resolve([] as any[]));
export const mockInsertMessage = mock(() => Promise.resolve({ id: 1 }));
export const mockUpsertReadReceipts = mock(() => Promise.resolve());
export const mockValidateMessageIds = mock(() => Promise.resolve([] as Partial<UserRow>[]));
export const mockFetchMessageWithSender = mock(() => Promise.resolve(null as any));

mock.module("../../src/data/message-queries", () => ({
  listMessages: mockListMessages,
  insertMessage: mockInsertMessage,
  upsertReadReceipts: mockUpsertReadReceipts,
  validateMessageIds: mockValidateMessageIds,
  fetchMessageWithSender: mockFetchMessageWithSender,
}));

// ---------------------------------------------------------------------------
// Data: conversation-queries
// ---------------------------------------------------------------------------
export const mockFetchConversationSummaries = mock(() =>
  Promise.resolve([] as ConversationSummary[]),
);
export const mockFetchConversationSummary = mock(() =>
  Promise.resolve(null as unknown as ConversationSummary),
);
export const mockFindExistingDm = mock(() => Promise.resolve(null as number | null));
export const mockCreateConversationWithMembers = mock(() => Promise.resolve(1));
export const mockGetConversationMembers = mock(() => Promise.resolve([]));
export const mockGetConversationMemberUserIds = mock(() => Promise.resolve([] as number[]));
export const mockUpdateConversationName = mock(() => Promise.resolve());
export const mockAddConversationMember = mock(() => Promise.resolve());
export const mockRemoveConversationMember = mock(() => Promise.resolve());

mock.module("../../src/data/conversation-queries", () => ({
  fetchConversationSummaries: mockFetchConversationSummaries,
  fetchConversationSummary: mockFetchConversationSummary,
  findExistingDm: mockFindExistingDm,
  createConversationWithMembers: mockCreateConversationWithMembers,
  getConversationMembers: mockGetConversationMembers,
  getConversationMemberUserIds: mockGetConversationMemberUserIds,
  updateConversationName: mockUpdateConversationName,
  addConversationMember: mockAddConversationMember,
  removeConversationMember: mockRemoveConversationMember,
}));

// ---------------------------------------------------------------------------
// Data: auth-queries
// ---------------------------------------------------------------------------
export const mockInsertAuthToken = mock(() => Promise.resolve());
export const mockFindAuthToken = mock(() => Promise.resolve(null as unknown as AuthTokenRow));
export const mockExpireAuthToken = mock(() => Promise.resolve());
export const mockExchangeConfirmedToken = mock(() =>
  Promise.resolve(null as unknown as AuthTokenRow),
);

mock.module("../../src/data/auth-queries", () => ({
  insertAuthToken: mockInsertAuthToken,
  findAuthToken: mockFindAuthToken,
  expireAuthToken: mockExpireAuthToken,
  exchangeConfirmedToken: mockExchangeConfirmedToken,
}));

// ---------------------------------------------------------------------------
// Data: push-queries
// ---------------------------------------------------------------------------
export const mockFindPushSubscription = mock(() => Promise.resolve(undefined as IdRow | undefined));
export const mockUpdatePushSubscriptionKeys = mock(() => Promise.resolve());
export const mockInsertPushSubscription = mock(() => Promise.resolve({ id: 1 }));
export const mockDeleteUserSubscriptions = mock(() => Promise.resolve());
export const mockDeleteSubscriptionByEndpoint = mock(() => Promise.resolve());
export const mockFindUserPushSubscriptions = mock(() =>
  Promise.resolve([] as PushSubscriptionRow[]),
);
export const mockDeletePushSubscriptionById = mock(() => Promise.resolve());

mock.module("../../src/data/push-queries", () => ({
  findPushSubscription: mockFindPushSubscription,
  updatePushSubscriptionKeys: mockUpdatePushSubscriptionKeys,
  insertPushSubscription: mockInsertPushSubscription,
  deleteUserSubscriptions: mockDeleteUserSubscriptions,
  deleteSubscriptionByEndpoint: mockDeleteSubscriptionByEndpoint,
  findUserPushSubscriptions: mockFindUserPushSubscriptions,
  deletePushSubscriptionById: mockDeletePushSubscriptionById,
}));

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export const mockEmit = mock(() => Promise.resolve());

mock.module("../../src/events", () => ({
  domainEvents: { emit: mockEmit },
}));

// ---------------------------------------------------------------------------
// Lib: redis
// ---------------------------------------------------------------------------
export const mockRedisGet = mock(() => Promise.resolve(null as unknown as string | null));
export const mockRedisSet = mock((..._args: unknown[]) => Promise.resolve("OK"));
export const mockRedisDel = mock(() => Promise.resolve(1));
export const mockRedisPublish = mock(() => Promise.resolve(0));
export const mockRedisIncr = mock((_key: string) => Promise.resolve(1));
export const mockRedisExpire = mock(() => Promise.resolve(1));
export const mockRedisTtl = mock(() => Promise.resolve(60));

mock.module("../../src/lib/redis", () => ({
  redisPublisher: {
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    publish: mockRedisPublish,
    incr: mockRedisIncr,
    expire: mockRedisExpire,
    ttl: mockRedisTtl,
    on: mock(),
  },
  createRedisSubscriber: mock(() => ({
    subscribe: mock(),
    unsubscribe: mock(),
    on: mock(),
    disconnect: mock(),
  })),
  redisUrl: "redis://localhost:6379",
}));

// ---------------------------------------------------------------------------
// Lib: jwt
// ---------------------------------------------------------------------------
export const mockSignToken = mock(() => "mock-jwt-token");
export const mockVerifyToken = mock(() => null as number | null);

mock.module("../../src/lib/jwt", () => ({
  signToken: mockSignToken,
  verifyToken: mockVerifyToken,
}));

// ---------------------------------------------------------------------------
// Lib: presence
// ---------------------------------------------------------------------------
export const mockGetPresenceStatus = mock(() =>
  Promise.resolve({ status: "offline", lastSeen: new Date().toISOString() }),
);
export const mockMarkOnline = mock(() => Promise.resolve());
export const mockMarkOffline = mock(() => Promise.resolve());
export const mockSetPresenceStatus = mock(() => Promise.resolve());

mock.module("../../src/lib/presence", () => ({
  getPresenceStatus: mockGetPresenceStatus,
  markOnline: mockMarkOnline,
  markOffline: mockMarkOffline,
  setPresenceStatus: mockSetPresenceStatus,
  PRESENCE_CHANNEL: "presence:updates",
}));

// ---------------------------------------------------------------------------
// Lib: r2
// ---------------------------------------------------------------------------
export const mockGetPresignedUploadUrl = mock((_key: string, _contentType: string) =>
  Promise.resolve({ url: "https://r2.dev/presigned", contentDisposition: "inline" }),
);
export const mockUploadBuffer = mock(() => Promise.resolve());
export const mockGetPublicUrl = mock((key: string) => `https://test.r2.dev/${key}`);

mock.module("../../src/lib/r2", () => ({
  getPresignedUploadUrl: mockGetPresignedUploadUrl,
  uploadBuffer: mockUploadBuffer,
  getPublicUrl: mockGetPublicUrl,
  getEnvOrThrow: (name: string) => process.env[name] ?? `test-${name}`,
  R2_PUBLIC_URL: "https://test.r2.dev",
}));

// ---------------------------------------------------------------------------
// Lib: web-push
// ---------------------------------------------------------------------------
export const mockSendPushNotification = mock(() =>
  Promise.resolve({ success: true, expired: false }),
);

mock.module("../../src/lib/web-push", () => ({
  sendPushNotification: mockSendPushNotification,
}));

// ---------------------------------------------------------------------------
// Lib: telegram-notifier
// ---------------------------------------------------------------------------
export const mockSendTelegramNotification = mock(() => Promise.resolve({ success: true }));

mock.module("../../src/lib/telegram-notifier", () => ({
  sendTelegramNotification: mockSendTelegramNotification,
}));

// ---------------------------------------------------------------------------
// Lib: telegram-avatar
// ---------------------------------------------------------------------------
export const mockUploadTelegramAvatarToR2 = mock(() => Promise.resolve(null as string | null));

mock.module("../../src/lib/telegram-avatar", () => ({
  uploadTelegramAvatarToR2: mockUploadTelegramAvatarToR2,
}));

// ---------------------------------------------------------------------------
// Reset helper — call in beforeEach to reset ALL mocks to defaults
// ---------------------------------------------------------------------------
export function resetAllMocks() {
  // Data: user-queries
  mockFindUserById.mockReset().mockResolvedValue(null);
  mockUpdateUser.mockReset().mockResolvedValue(null);
  mockSearchUsers.mockReset().mockResolvedValue([]);
  mockFindUsersByIds.mockReset().mockResolvedValue([] as UserRow[]);
  mockUpdateNotificationChannel.mockReset().mockResolvedValue(null);
  mockUpdateLastSeen.mockReset().mockResolvedValue(undefined);
  mockGetLastSeenAt.mockReset().mockResolvedValue(null);

  // Data: message-queries
  mockListMessages.mockReset().mockResolvedValue([]);
  mockInsertMessage.mockReset().mockResolvedValue({ id: 1 });
  mockUpsertReadReceipts.mockReset().mockResolvedValue(undefined);
  mockValidateMessageIds.mockReset().mockResolvedValue([]);
  mockFetchMessageWithSender.mockReset().mockResolvedValue(null);

  // Data: conversation-queries
  mockFetchConversationSummaries.mockReset().mockResolvedValue([]);
  mockFetchConversationSummary
    .mockReset()
    .mockResolvedValue(null as unknown as ConversationSummary);
  mockFindExistingDm.mockReset().mockResolvedValue(null);
  mockCreateConversationWithMembers.mockReset().mockResolvedValue(1);
  mockGetConversationMembers.mockReset().mockResolvedValue([]);
  mockGetConversationMemberUserIds.mockReset().mockResolvedValue([]);
  mockUpdateConversationName.mockReset().mockResolvedValue(undefined);
  mockAddConversationMember.mockReset().mockResolvedValue(undefined);
  mockRemoveConversationMember.mockReset().mockResolvedValue(undefined);

  // Data: auth-queries
  mockInsertAuthToken.mockReset().mockResolvedValue(undefined);
  mockFindAuthToken.mockReset().mockResolvedValue(null as unknown as AuthTokenRow);
  mockExpireAuthToken.mockReset().mockResolvedValue(undefined);
  mockExchangeConfirmedToken.mockReset().mockResolvedValue(null as unknown as AuthTokenRow);

  // Data: push-queries
  mockFindPushSubscription.mockReset().mockResolvedValue(undefined);
  mockUpdatePushSubscriptionKeys.mockReset().mockResolvedValue(undefined);
  mockInsertPushSubscription.mockReset().mockResolvedValue({ id: 1 });
  mockDeleteUserSubscriptions.mockReset().mockResolvedValue(undefined);
  mockDeleteSubscriptionByEndpoint.mockReset().mockResolvedValue(undefined);
  mockFindUserPushSubscriptions.mockReset().mockResolvedValue([]);
  mockDeletePushSubscriptionById.mockReset().mockResolvedValue(undefined);

  // Events
  mockEmit.mockReset().mockResolvedValue(undefined);

  // Lib: redis
  mockRedisGet.mockReset().mockResolvedValue(null);
  mockRedisSet.mockReset().mockResolvedValue("OK");
  mockRedisDel.mockReset().mockResolvedValue(1);
  mockRedisPublish.mockReset().mockResolvedValue(0);
  mockRedisIncr.mockReset().mockResolvedValue(1);
  mockRedisExpire.mockReset().mockResolvedValue(1);
  mockRedisTtl.mockReset().mockResolvedValue(60);

  // Lib: jwt
  mockSignToken.mockReset().mockReturnValue("mock-jwt-token");
  mockVerifyToken.mockReset().mockReturnValue(null);

  // Lib: presence
  mockGetPresenceStatus.mockReset().mockResolvedValue({
    status: "offline",
    lastSeen: new Date().toISOString(),
  });
  mockMarkOnline.mockReset().mockResolvedValue(undefined);
  mockMarkOffline.mockReset().mockResolvedValue(undefined);

  // Lib: r2
  mockGetPresignedUploadUrl.mockReset().mockResolvedValue({
    url: "https://r2.dev/presigned",
    contentDisposition: "inline",
  });
  mockGetPublicUrl.mockReset().mockImplementation((key: string) => `https://test.r2.dev/${key}`);

  // Lib: web-push & telegram
  mockSendPushNotification.mockReset().mockResolvedValue({ success: true, expired: false });
  mockSendTelegramNotification.mockReset().mockResolvedValue({ success: true });
  mockUploadTelegramAvatarToR2.mockReset().mockResolvedValue(null);
}
