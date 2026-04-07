import { trpc } from "./trpc";
import { findAndRemoveOptimistic, cleanupStale } from "./optimistic-messages";
import type { CurrentUser } from "./trpc-types";

export type SSEUtils = ReturnType<typeof trpc.useUtils>;
export type TypingTimers = Map<number, ReturnType<typeof setTimeout>>;

export function normalizeDate(value: string | Date | undefined) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime();
}

export function handleNewMessage(
  utils: SSEUtils,
  user: CurrentUser | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: Record<string, any>,
  typingTimers: TypingTimers,
) {
  const message = detail.message;
  const conversationId = detail.conversationId as number;
  const pendingEntry = findAndRemoveOptimistic(conversationId, message);
  cleanupStale();

  utils.messages.list.setInfiniteData(
    { conversationId },
    (previous) => {
      if (!previous) return previous;
      const alreadyExists = previous.pages.some((page) =>
        page.messages.some((m) => m.id === message.id),
      );
      if (alreadyExists) return previous;

      if (pendingEntry) {
        // Replace the optimistic message in-place with the real one
        return {
          pages: previous.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m.id === pendingEntry.negativeId ? message : m,
            ),
          })),
          pageParams: previous.pageParams,
        };
      }

      const firstPage = previous.pages[0];
      const restPages = previous.pages.slice(1);
      const updatedFirstPage = firstPage
        ? {
            ...firstPage,
            messages: [message, ...firstPage.messages],
          }
        : { messages: [message], nextCursor: undefined };
      return {
        pages: [updatedFirstPage, ...restPages],
        pageParams: previous.pageParams,
      };
    },
  );

  utils.conversations.list.setData(undefined, (data) => {
    if (!data) return data;
    const items = data.conversations.slice();
    let found = false;
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].id === conversationId) {
        found = true;
        const unreadIncrement =
          user && message.sender?.id !== user.id ? 1 : 0;
        items[i] = {
          ...items[i],
          lastMessage: message,
          unreadCount: Math.max(
            0,
            (items[i].unreadCount ?? 0) + unreadIncrement,
          ),
        };
        break;
      }
    }
    if (!found) {
      return data;
    }
    items.sort((a, b) => {
      const aTime = normalizeDate(a.lastMessage?.createdAt ?? a.createdAt);
      const bTime = normalizeDate(b.lastMessage?.createdAt ?? b.createdAt);
      return bTime - aTime;
    });
    return { conversations: items };
  });

  // Clear typing indicator for this conversation when a new message arrives
  const existingTimer = typingTimers.get(conversationId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    typingTimers.delete(conversationId);
  }
  utils.conversations.list.setData(undefined, (d) => {
    if (!d) return d;
    return {
      conversations: d.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, typingUserId: undefined, isTyping: false }
          : c,
      ),
    };
  });

  if (user && message.sender?.id !== user.id) {
    window.dispatchEvent(new CustomEvent("newchat:new-message"));
  }
}

export function handleTyping(
  utils: SSEUtils,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: Record<string, any>,
  userId: number | undefined,
  typingTimers: TypingTimers,
) {
  if (detail.userId === userId) {
    return;
  }
  utils.conversations.list.setData(undefined, (data) => {
    if (!data) return data;
    return {
      conversations: data.conversations.map((conversation) =>
        conversation.id === detail.conversationId
          ? { ...conversation, typingUserId: detail.userId, isTyping: true }
          : conversation,
      ),
    };
  });
  const existing = typingTimers.get(detail.conversationId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    utils.conversations.list.setData(undefined, (data) => {
      if (!data) return data;
      return {
        conversations: data.conversations.map((conversation) =>
          conversation.id === detail.conversationId
            ? { ...conversation, typingUserId: undefined, isTyping: false }
            : conversation,
        ),
      };
    });
    typingTimers.delete(detail.conversationId);
  }, 3000);
  typingTimers.set(detail.conversationId, timer);
}

export function handleMessageRead(
  utils: SSEUtils,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: Record<string, any>,
  currentUserId?: number,
) {
  const readIds = new Set(detail.messageIds as number[]);
  const isMyRead = detail.userId === currentUserId;
  utils.messages.list.setInfiniteData(
    { conversationId: detail.conversationId },
    (current) => {
      if (!current) return current;
      return {
        pages: current.pages.map((page) => ({
          ...page,
          messages: page.messages.map((msg) => {
            if (!readIds.has(msg.id)) return msg;
            const updates: Record<string, boolean> = {};
            if (msg.sender?.id !== detail.userId) {
              updates.readByOthers = true;
            }
            if (isMyRead) {
              updates.readByMe = true;
            }
            return Object.keys(updates).length > 0
              ? { ...msg, ...updates }
              : msg;
          }),
        })),
        pageParams: current.pageParams,
      };
    },
  );
  utils.conversations.list.setData(undefined, (data) => {
    if (!data) return data;
    const items = data.conversations.map((conversation) => {
      if (conversation.id === detail.conversationId) {
        return { ...conversation, unreadCount: 0 };
      }
      return conversation;
    });
    return { conversations: items };
  });
}

export function handleMembership(
  utils: SSEUtils,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>,
) {
  utils.conversations.list.setData(undefined, (data) => {
    if (!data) return data;
    const existing = data.conversations.find(
      (conversation) => conversation.id === payload.conversation?.id,
    );
    let conversations = data.conversations;
    if (payload.type === "join" && payload.conversation) {
      if (existing) {
        conversations = data.conversations.map((conversation) =>
          conversation.id === payload.conversation.id
            ? payload.conversation
            : conversation,
        );
      } else {
        conversations = [payload.conversation, ...data.conversations];
      }
    } else if (payload.type === "leave" && payload.conversationId) {
      conversations = data.conversations.filter(
        (conversation) => conversation.id !== payload.conversationId,
      );
    }
    conversations.sort((a, b) => {
      const aTime = normalizeDate(a.lastMessage?.createdAt ?? a.createdAt);
      const bTime = normalizeDate(b.lastMessage?.createdAt ?? b.createdAt);
      return bTime - aTime;
    });
    return { conversations };
  });
}

export function handleConversationUpdated(
  utils: SSEUtils,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: Record<string, any>,
) {
  const conversationId = detail.conversationId as number;
  const name = detail.name as string;
  utils.conversations.list.setData(undefined, (data) => {
    if (!data) return data;
    return {
      conversations: data.conversations.map((c) =>
        c.id === conversationId ? { ...c, name } : c,
      ),
    };
  });
}

export function handleMemberAdded(
  utils: SSEUtils,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: Record<string, any>,
) {
  const conversationId = detail.conversationId as number;
  utils.conversations.members
    .invalidate({ conversationId })
    .catch(() => {});
  utils.conversations.list.invalidate().catch(() => {});
}

export function handleMemberRemoved(
  utils: SSEUtils,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: Record<string, any>,
  currentUserId?: number,
) {
  const conversationId = detail.conversationId as number;
  if (detail.userId === currentUserId) {
    utils.conversations.list.setData(undefined, (data) => {
      if (!data) return data;
      return {
        conversations: data.conversations.filter(
          (c) => c.id !== conversationId,
        ),
      };
    });
  } else {
    utils.conversations.members
      .invalidate({ conversationId })
      .catch(() => {});
  }
}

export function handlePresence(
  utils: SSEUtils,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>,
) {
  if (typeof payload.userId !== "number") return;
  utils.users.profile.invalidate({ userId: payload.userId }).catch(() => {});
  utils.users.search.invalidate().catch(() => {});
  utils.users.presence.invalidate().catch(() => {});
}
