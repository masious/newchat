import { describe, test, expect, beforeEach } from "bun:test";
import { createTestUser, createTestPushSubscription } from "../../tests/helpers/factories.test";
import {
  resetAllMocks,
  mockFindUserById,
  mockFindUserPushSubscriptions,
  mockDeletePushSubscriptionById,
  mockSendPushNotification,
  mockSendTelegramNotification,
} from "../../tests/helpers/module-mocks";

import { notifyUserOfMessage } from "./notification-service";

const basePayload = {
  recipientUserId: 1,
  senderName: "Alice",
  content: "Hello",
  conversationId: 10,
};

beforeEach(() => {
  resetAllMocks();
});

describe("notifyUserOfMessage", () => {
  test("no-op when user not found", async () => {
    await notifyUserOfMessage({} as any, basePayload);
    expect(mockSendPushNotification).not.toHaveBeenCalled();
    expect(mockSendTelegramNotification).not.toHaveBeenCalled();
  });

  test("no-op when channel is none", async () => {
    mockFindUserById.mockResolvedValueOnce(createTestUser({ notificationChannel: "none" }));
    await notifyUserOfMessage({} as any, basePayload);
    expect(mockSendPushNotification).not.toHaveBeenCalled();
    expect(mockSendTelegramNotification).not.toHaveBeenCalled();
  });

  test("sends web push when channel is web", async () => {
    mockFindUserById.mockResolvedValueOnce(createTestUser({ notificationChannel: "web" }));
    mockFindUserPushSubscriptions.mockResolvedValueOnce([createTestPushSubscription()]);

    await notifyUserOfMessage({} as any, basePayload);

    expect(mockSendPushNotification).toHaveBeenCalled();
    expect(mockSendTelegramNotification).not.toHaveBeenCalled();
  });

  test("sends telegram when channel is telegram", async () => {
    mockFindUserById.mockResolvedValueOnce(
      createTestUser({ notificationChannel: "telegram", telegramId: "tg_1" }),
    );

    await notifyUserOfMessage({} as any, basePayload);

    expect(mockSendTelegramNotification).toHaveBeenCalledWith(
      "tg_1",
      expect.objectContaining({ senderName: "Alice", content: "Hello" }),
    );
    expect(mockFindUserPushSubscriptions).not.toHaveBeenCalled();
  });

  test("sends both when channel is both", async () => {
    mockFindUserById.mockResolvedValueOnce(
      createTestUser({ notificationChannel: "both", telegramId: "tg_1" }),
    );
    mockFindUserPushSubscriptions.mockResolvedValueOnce([createTestPushSubscription()]);

    await notifyUserOfMessage({} as any, basePayload);

    expect(mockSendPushNotification).toHaveBeenCalled();
    expect(mockSendTelegramNotification).toHaveBeenCalled();
  });

  test("deletes expired push subscriptions", async () => {
    mockFindUserById.mockResolvedValueOnce(createTestUser({ notificationChannel: "web" }));
    mockFindUserPushSubscriptions.mockResolvedValueOnce([createTestPushSubscription({ id: 7 })]);
    mockSendPushNotification.mockResolvedValueOnce({ success: false, expired: true });

    await notifyUserOfMessage({} as any, basePayload);

    expect(mockDeletePushSubscriptionById).toHaveBeenCalledWith(expect.anything(), 7);
  });
});
