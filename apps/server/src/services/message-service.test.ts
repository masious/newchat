import { describe, test, expect, beforeEach } from "bun:test";
import { createMockDb } from "../../tests/helpers/mocks";
import { createTestMessageWithSender } from "../../tests/helpers/factories.test";
import {
  resetAllMocks,
  mockListMessages,
  mockInsertMessage,
  mockUpsertReadReceipts,
  mockValidateMessageIds,
  mockFetchMessageWithSender,
  mockEmit,
} from "../../tests/helpers/module-mocks";
import { ForbiddenError, BadRequestError } from "../errors";

import * as messageService from "./message-service";

function authPassDb() {
  const db = createMockDb();
  db.query.conversationMembers.findFirst.mockResolvedValue({
    conversation: { id: 10, type: "dm", name: null, createdBy: null, createdAt: new Date() },
  });
  return db;
}

beforeEach(() => {
  resetAllMocks();
});

describe("list", () => {
  test("returns messages with pagination", async () => {
    const db = authPassDb();
    const items = [createTestMessageWithSender({ id: 3 }), createTestMessageWithSender({ id: 2 })];
    mockListMessages.mockResolvedValueOnce(items);

    const result = await messageService.list(db as any, { conversationId: 10, senderId: 1 });

    expect(result.messages).toHaveLength(2);
    expect(result.nextCursor).toBeUndefined();
  });

  test("sets nextCursor when hasMore", async () => {
    const db = authPassDb();
    const items = Array.from({ length: 26 }, (_, i) =>
      createTestMessageWithSender({ id: 26 - i }),
    );
    mockListMessages.mockResolvedValueOnce(items);

    const result = await messageService.list(db as any, { conversationId: 10, senderId: 1 });

    expect(result.messages).toHaveLength(25);
    expect(result.nextCursor).toBe(result.messages[24].id);
  });

  test("enforces conversation membership", async () => {
    const db = createMockDb();
    db.query.conversationMembers.findFirst.mockResolvedValueOnce(null);

    await expect(
      messageService.list(db as any, { conversationId: 10, senderId: 999 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("passes limit to query", async () => {
    const db = authPassDb();
    mockListMessages.mockResolvedValueOnce([]);
    await messageService.list(db as any, { conversationId: 10, senderId: 1, limit: 5 });

    expect(mockListMessages).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 5 }),
    );
  });
});

describe("send", () => {
  test("inserts message and creates read receipt for sender", async () => {
    const db = authPassDb();
    const created = createTestMessageWithSender({ id: 42 });
    mockInsertMessage.mockResolvedValueOnce({ id: 42 });
    mockFetchMessageWithSender.mockResolvedValueOnce(created);

    const result = await messageService.send(db as any, {
      conversationId: 10, senderId: 1, content: "hello",
    });

    expect(result.message).toEqual(created);
    expect(mockUpsertReadReceipts).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ messageIds: [42], userId: 1 }),
    );
  });

  test("emits message.sent domain event", async () => {
    const db = authPassDb();
    const created = createTestMessageWithSender({ id: 42 });
    mockInsertMessage.mockResolvedValueOnce({ id: 42 });
    mockFetchMessageWithSender.mockResolvedValueOnce(created);

    await messageService.send(db as any, {
      conversationId: 10, senderId: 1, content: "hello",
    });

    expect(mockEmit).toHaveBeenCalledWith(
      "message.sent",
      expect.objectContaining({ conversationId: 10, senderId: 1, message: created }),
    );
  });

  test("does not emit event when fetchMessageWithSender returns null", async () => {
    const db = authPassDb();
    mockInsertMessage.mockResolvedValueOnce({ id: 42 });
    mockFetchMessageWithSender.mockResolvedValueOnce(null);

    await messageService.send(db as any, {
      conversationId: 10, senderId: 1, content: "hello",
    });

    expect(mockEmit).not.toHaveBeenCalled();
  });

  test("throws ForbiddenError for non-member", async () => {
    const db = createMockDb();
    db.query.conversationMembers.findFirst.mockResolvedValueOnce(null);

    await expect(
      messageService.send(db as any, { conversationId: 10, senderId: 999, content: "hello" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("markRead", () => {
  test("upserts read receipts and emits event", async () => {
    const db = authPassDb();
    mockValidateMessageIds.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    const result = await messageService.markRead(db as any, {
      conversationId: 10, userId: 1, messageIds: [1, 2],
    });

    expect(result).toEqual({ success: true });
    expect(mockUpsertReadReceipts).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ messageIds: [1, 2], userId: 1 }),
    );
    expect(mockEmit).toHaveBeenCalledWith(
      "message.read",
      expect.objectContaining({ conversationId: 10, messageIds: [1, 2], userId: 1 }),
    );
  });

  test("throws BadRequestError for invalid messageIds", async () => {
    const db = authPassDb();
    mockValidateMessageIds.mockResolvedValueOnce([{ id: 1 }]);

    await expect(
      messageService.markRead(db as any, { conversationId: 10, userId: 1, messageIds: [1, 2] }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe("typing", () => {
  test("enforces membership and emits event", async () => {
    const db = authPassDb();

    const result = await messageService.typing(db as any, { conversationId: 10, userId: 1 });

    expect(result).toEqual({ success: true });
    expect(mockEmit).toHaveBeenCalledWith(
      "message.typing",
      expect.objectContaining({ conversationId: 10, userId: 1 }),
    );
  });
});
