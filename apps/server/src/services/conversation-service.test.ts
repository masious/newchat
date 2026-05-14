import { beforeEach, describe, expect, test } from "bun:test";
import { createTestConversationSummary } from "../../tests/helpers/factories.test";
import { createMockDb } from "../../tests/helpers/mocks";
import {
  mockAddConversationMember,
  mockCreateConversationWithMembers,
  mockEmit,
  mockFetchConversationSummaries,
  mockFetchConversationSummary,
  mockFindExistingDm,
  mockFindUsersByIds,
  mockGetConversationMemberUserIds,
  mockRemoveConversationMember,
  mockUpdateConversationName,
  resetAllMocks,
} from "../../tests/helpers/module-mocks";
import { BadRequestError, ForbiddenError } from "../errors";

import * as conversationService from "./conversation-service";

function memberDb(conv: {
  id: number;
  type: string;
  name: string | null;
  createdBy: number | null;
}) {
  const db = createMockDb();
  db.query.conversationMembers.findFirst.mockResolvedValue({
    conversation: { ...conv, createdAt: new Date() },
  });
  return db;
}

function groupOwnerDb(id = 1, createdBy = 1) {
  return memberDb({ id, type: "group", name: "Team", createdBy });
}

const summary = (overrides = {}) => createTestConversationSummary(overrides);

beforeEach(() => {
  resetAllMocks();
  // ensureUsersExist: return matching IDs by default
  mockFindUsersByIds.mockImplementation((_db: any, ids: number[]) =>
    Promise.resolve(ids.map((id: number) => ({ id }))),
  );
});

describe("list", () => {
  test("returns conversations for user", async () => {
    const db = createMockDb();
    const summaries = [summary()];
    mockFetchConversationSummaries.mockResolvedValueOnce(summaries);

    const result = await conversationService.list(db, { userId: 1 });
    expect(result.conversations).toEqual(summaries);
  });
});

describe("create", () => {
  describe("DM", () => {
    test("creates new DM with exactly 2 members", async () => {
      const db = createMockDb();
      const s = summary({ type: "dm" });
      mockFetchConversationSummary.mockResolvedValueOnce(s);

      const result = await conversationService.create(db, {
        creatorId: 1,
        type: "dm",
        memberUserIds: [2],
      });

      expect(result.conversation).toEqual(s);
      expect(mockCreateConversationWithMembers).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: "dm" }),
      );
    });

    test("returns existing DM when one already exists", async () => {
      const db = createMockDb();
      const s = summary({ id: 99, type: "dm" });
      mockFindExistingDm.mockResolvedValueOnce(99);
      mockFetchConversationSummary.mockResolvedValueOnce(s);

      const result = await conversationService.create(db, {
        creatorId: 1,
        type: "dm",
        memberUserIds: [2],
      });

      expect(result.conversation).toEqual(s);
      expect(mockCreateConversationWithMembers).not.toHaveBeenCalled();
    });

    test("throws BadRequestError when DM has != 2 members", async () => {
      const db = createMockDb();
      await expect(
        conversationService.create(db, {
          creatorId: 1,
          type: "dm",
          memberUserIds: [2, 3],
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    test("deduplicates memberIds and includes creator", async () => {
      const db = createMockDb();
      const s = summary({ type: "dm" });
      mockFetchConversationSummary.mockResolvedValueOnce(s);

      await conversationService.create(db, {
        creatorId: 1,
        type: "dm",
        memberUserIds: [2, 1, 2],
      });

      expect(mockFindUsersByIds).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([1, 2]),
      );
    });
  });

  describe("group", () => {
    test("creates group with name", async () => {
      const db = createMockDb();
      const s = summary({ type: "group", name: "Team" });
      mockFetchConversationSummary.mockResolvedValueOnce(s);

      const result = await conversationService.create(db, {
        creatorId: 1,
        type: "group",
        memberUserIds: [2, 3],
        name: "Team",
      });

      expect(result.conversation).toEqual(s);
      expect(mockCreateConversationWithMembers).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: "group", name: "Team", createdBy: 1 }),
      );
    });

    test("throws BadRequestError when group has no name", async () => {
      const db = createMockDb();
      await expect(
        conversationService.create(db, {
          creatorId: 1,
          type: "group",
          memberUserIds: [2],
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    test("throws BadRequestError when group has < 2 members", async () => {
      const db = createMockDb();
      await expect(
        conversationService.create(db, {
          creatorId: 1,
          type: "group",
          memberUserIds: [],
          name: "Solo",
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    test("emits conversation.created event", async () => {
      const db = createMockDb();
      const s = summary({ type: "group" });
      mockFetchConversationSummary.mockResolvedValueOnce(s);

      await conversationService.create(db, {
        creatorId: 1,
        type: "group",
        memberUserIds: [2, 3],
        name: "Team",
      });

      expect(mockEmit).toHaveBeenCalledWith(
        "conversation.created",
        expect.objectContaining({ conversationId: expect.any(Number), creatorId: 1 }),
      );
    });
  });
});

describe("updateName", () => {
  test("updates name and emits event", async () => {
    const db = groupOwnerDb();

    const result = await conversationService.updateName(db, {
      conversationId: 1,
      userId: 1,
      name: "New Name",
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdateConversationName).toHaveBeenCalledWith(expect.anything(), 1, "New Name");
    expect(mockEmit).toHaveBeenCalledWith(
      "conversation.renamed",
      expect.objectContaining({ conversationId: 1, name: "New Name" }),
    );
  });

  test("throws ForbiddenError for non-owner", async () => {
    const db = createMockDb();
    db.query.conversationMembers.findFirst.mockResolvedValueOnce(null);

    await expect(
      conversationService.updateName(db, { conversationId: 1, userId: 999, name: "Nope" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("addMember", () => {
  test("adds member and emits event", async () => {
    const db = groupOwnerDb();
    mockGetConversationMemberUserIds.mockResolvedValueOnce([1, 2]);

    const result = await conversationService.addMember(db, {
      conversationId: 1,
      userId: 1,
      memberUserId: 3,
    });

    expect(result).toEqual({ success: true });
    expect(mockAddConversationMember).toHaveBeenCalledWith(expect.anything(), 1, 3);
    expect(mockEmit).toHaveBeenCalledWith(
      "member.added",
      expect.objectContaining({ conversationId: 1, userId: 3 }),
    );
  });

  test("throws BadRequestError when user is already a member", async () => {
    const db = groupOwnerDb();
    mockGetConversationMemberUserIds.mockResolvedValueOnce([1, 2, 3]);

    await expect(
      conversationService.addMember(db, {
        conversationId: 1,
        userId: 1,
        memberUserId: 3,
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe("removeMember", () => {
  test("removes member and emits event", async () => {
    const db = groupOwnerDb();

    const result = await conversationService.removeMember(db, {
      conversationId: 1,
      userId: 1,
      memberUserId: 2,
    });

    expect(result).toEqual({ success: true });
    expect(mockRemoveConversationMember).toHaveBeenCalledWith(expect.anything(), 1, 2);
    expect(mockEmit).toHaveBeenCalledWith(
      "member.removed",
      expect.objectContaining({ conversationId: 1, userId: 2 }),
    );
  });

  test("throws BadRequestError when removing group owner", async () => {
    const db = groupOwnerDb(1, 1);

    await expect(
      conversationService.removeMember(db, {
        conversationId: 1,
        userId: 1,
        memberUserId: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
