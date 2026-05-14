import { beforeEach, describe, expect, test } from "bun:test";
import { createTestUser } from "../../tests/helpers/factories.test";
import {
  mockFindUserById,
  mockGetPresenceStatus,
  mockSearchUsers,
  mockUpdateNotificationChannel,
  mockUpdateUser,
  mockUploadTelegramAvatarToR2,
  resetAllMocks,
} from "../../tests/helpers/module-mocks";
import { BadRequestError, NotFoundError } from "../errors";

import * as userService from "./user-service";

beforeEach(() => {
  resetAllMocks();
});

describe("getMe", () => {
  test("returns user", async () => {
    const user = createTestUser();
    mockFindUserById.mockResolvedValueOnce(user);

    const result = await userService.getMe({} as any, 1);
    expect(result.user).toEqual(user);
  });

  test("throws NotFoundError when user does not exist", async () => {
    await expect(userService.getMe({} as any, 999)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("update", () => {
  test("updates user fields", async () => {
    const updated = createTestUser({ username: "newname", firstName: "Alice" });
    mockUpdateUser.mockResolvedValueOnce(updated);

    const result = await userService.update({} as any, 1, {
      username: "newname",
      displayName: "Alice",
    });

    expect(result.user).toEqual(updated);
    expect(mockUpdateUser).toHaveBeenCalledWith(
      expect.anything(),
      1,
      expect.objectContaining({ username: "newname", firstName: "Alice" }),
    );
  });

  test("throws BadRequestError on duplicate username", async () => {
    mockUpdateUser.mockRejectedValueOnce({ code: "23505", constraint: "users_username_unique" });

    await expect(
      userService.update({} as any, 1, { username: "taken", displayName: "Bob" }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  test("throws NotFoundError when user does not exist", async () => {
    await expect(
      userService.update({} as any, 999, { username: "name", displayName: "Name" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("search", () => {
  test("returns users enriched with presence", async () => {
    const user = createTestUser();
    mockSearchUsers.mockResolvedValueOnce([user]);
    mockGetPresenceStatus.mockResolvedValueOnce({
      status: "online",
      lastSeen: new Date().toISOString(),
    });

    const result = await userService.search({} as any, { query: "user" });

    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toHaveProperty("presence");
    expect(result.users[0].presence.status).toBe("online");
  });

  test("passes limit and excludeUserId to query", async () => {
    await userService.search({} as any, { query: "test", limit: 5, excludeUserId: 1 });

    expect(mockSearchUsers).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ query: "test", limit: 5, excludeUserId: 1 }),
    );
  });
});

describe("getProfile", () => {
  test("returns user with presence", async () => {
    const user = createTestUser();
    mockFindUserById.mockResolvedValueOnce(user);

    const result = await userService.getProfile({} as any, { targetUserId: 1, requesterId: 2 });

    expect(result.user).toHaveProperty("presence");
    expect(mockGetPresenceStatus).toHaveBeenCalled();
  });

  test("throws NotFoundError when user does not exist", async () => {
    await expect(
      userService.getProfile({} as any, { targetUserId: 999, requesterId: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("fetchTelegramAvatar", () => {
  test("uploads avatar and returns URL", async () => {
    const user = createTestUser({ telegramId: "tg_123" });
    mockFindUserById.mockResolvedValueOnce(user);
    mockUploadTelegramAvatarToR2.mockResolvedValueOnce("https://r2.dev/avatar.jpg");

    const result = await userService.fetchTelegramAvatar({} as any, 1);
    expect(result.avatarUrl).toBe("https://r2.dev/avatar.jpg");
  });

  test("throws NotFoundError when user does not exist", async () => {
    await expect(userService.fetchTelegramAvatar({} as any, 999)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("updateNotificationPreferences", () => {
  test("updates channel and returns user", async () => {
    const updated = createTestUser({ notificationChannel: "web" });
    mockUpdateNotificationChannel.mockResolvedValueOnce(updated);

    const result = await userService.updateNotificationPreferences({} as any, 1, "web");
    expect(result.user).toEqual(updated);
  });

  test("throws NotFoundError when user does not exist", async () => {
    await expect(
      userService.updateNotificationPreferences({} as any, 999, "none"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
