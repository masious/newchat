import { beforeEach, describe, expect, test } from "bun:test";
import { createMockDb } from "../../tests/helpers/mocks";
import { mockFindUsersByIds, resetAllMocks } from "../../tests/helpers/module-mocks";
import { BadRequestError, ForbiddenError } from "../errors";
import { ensureConversationMember, ensureGroupOwner, ensureUsersExist } from "./authorization";

beforeEach(() => {
  resetAllMocks();
});

describe("ensureConversationMember", () => {
  test("returns conversation when user is a member", async () => {
    const db = createMockDb();
    const conversation = {
      id: 1,
      type: "dm" as const,
      name: null,
      createdBy: null,
      createdAt: new Date(),
    };
    db.query.conversationMembers.findFirst.mockResolvedValueOnce({ conversation });

    const result = await ensureConversationMember(db as any, 1, 1);
    expect(result).toEqual(conversation);
  });

  test("throws ForbiddenError when user is not a member", async () => {
    const db = createMockDb();
    db.query.conversationMembers.findFirst.mockResolvedValueOnce(null);

    await expect(ensureConversationMember(db as any, 1, 999)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  test("throws ForbiddenError when conversation does not exist", async () => {
    const db = createMockDb();
    db.query.conversationMembers.findFirst.mockResolvedValueOnce(null);

    await expect(ensureConversationMember(db as any, 999, 1)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("ensureGroupOwner", () => {
  test("returns conversation when user is the group owner", async () => {
    const db = createMockDb();
    const conversation = {
      id: 1,
      type: "group" as const,
      name: "Team",
      createdBy: 1,
      createdAt: new Date(),
    };
    db.query.conversationMembers.findFirst.mockResolvedValueOnce({ conversation });

    const result = await ensureGroupOwner(db as any, 1, 1);
    expect(result).toEqual(conversation);
  });

  test("throws ForbiddenError when user is member but not owner", async () => {
    const db = createMockDb();
    const conversation = {
      id: 1,
      type: "group",
      name: "Team",
      createdBy: 2,
      createdAt: new Date(),
    };
    db.query.conversationMembers.findFirst.mockResolvedValueOnce({ conversation });

    await expect(ensureGroupOwner(db as any, 1, 1)).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("throws ForbiddenError when conversation is a DM", async () => {
    const db = createMockDb();
    const conversation = { id: 1, type: "dm", name: null, createdBy: null, createdAt: new Date() };
    db.query.conversationMembers.findFirst.mockResolvedValueOnce({ conversation });

    await expect(ensureGroupOwner(db as any, 1, 1)).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("allows any member when createdBy is null", async () => {
    const db = createMockDb();
    const conversation = {
      id: 1,
      type: "group" as const,
      name: "Team",
      createdBy: null,
      createdAt: new Date(),
    };
    db.query.conversationMembers.findFirst.mockResolvedValueOnce({ conversation });

    const result = await ensureGroupOwner(db as any, 1, 1);
    expect(result).toEqual(conversation);
  });
});

describe("ensureUsersExist", () => {
  test("passes when all users exist", async () => {
    const db = createMockDb();
    mockFindUsersByIds.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    await expect(ensureUsersExist(db as any, [1, 2])).resolves.toBeUndefined();
  });

  test("throws BadRequestError when users are missing", async () => {
    const db = createMockDb();
    mockFindUsersByIds.mockResolvedValueOnce([{ id: 1 }]);

    await expect(ensureUsersExist(db as any, [1, 2])).rejects.toBeInstanceOf(BadRequestError);
  });

  test("no-op for empty array", async () => {
    const db = createMockDb();
    await expect(ensureUsersExist(db as any, [])).resolves.toBeUndefined();
    expect(mockFindUsersByIds).not.toHaveBeenCalled();
  });
});
