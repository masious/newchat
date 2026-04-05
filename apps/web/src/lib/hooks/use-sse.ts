"use client";

import { useEffect, useRef, useCallback } from "react";
import { trpc } from "../trpc";
import { useAuth } from "../providers/auth-context";
import { findAndRemoveOptimistic, cleanupStale } from "../optimistic-messages";

const defaultServerUrl =
  process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

const MAX_RETRIES = 10;

function normalizeDate(value: string | Date | undefined) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime();
}

export function useSSE() {
  const { token, user } = useAuth();
  const utils = trpc.useUtils();
  const typingTimers = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());
  const hasConnectedBefore = useRef(false);

  const refetchAfterReconnect = useCallback(() => {
    utils.conversations.list.invalidate();
    utils.messages.list.invalidate();
  }, [utils]);

  const createTicket = trpc.sse.createTicket.useMutation();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let source: EventSource | null = null;

    const handleConversationEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data ?? "{}");
        if (!payload || !payload.payload) return;
        const { payload: detail } = payload;
        if (!detail || typeof detail !== "object") return;
        if (detail.type === "new_message" && detail.message) {
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
          const existingTimer = typingTimers.current.get(conversationId);
          if (existingTimer) {
            clearTimeout(existingTimer);
            typingTimers.current.delete(conversationId);
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
        } else if (detail.type === "typing") {
          if (detail.userId === user?.id) {
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
          const existing = typingTimers.current.get(detail.conversationId);
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
            typingTimers.current.delete(detail.conversationId);
          }, 3000);
          typingTimers.current.set(detail.conversationId, timer);
        } else if (detail.type === "message_read") {
          const readIds = new Set(detail.messageIds as number[]);
          utils.messages.list.setInfiniteData(
            { conversationId: detail.conversationId },
            (current) => {
              if (!current) return current;
              return {
                pages: current.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((msg) =>
                    readIds.has(msg.id) && msg.sender?.id !== detail.userId
                      ? { ...msg, readByOthers: true }
                      : msg,
                  ),
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
      } catch (error) {
        console.error("Failed to process SSE conversation event", error);
      }
    };

    const handleMembershipEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data ?? "{}");
        if (!payload) return;
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
      } catch (error) {
        console.error("Failed to process SSE membership event", error);
      }
    };

    const handlePresenceEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data ?? "{}");
        if (!payload || typeof payload.userId !== "number") return;
        utils.users.profile.invalidate({ userId: payload.userId }).catch(() => {});
        utils.users.search.invalidate().catch(() => {});
        utils.users.presence.invalidate().catch(() => {});
      } catch (error) {
        console.error("Failed to process SSE presence event", error);
      }
    };

    let retryCount = 0;

    async function connect() {
      try {
        const { ticket } = await createTicket.mutateAsync();
        if (cancelled) return;

        const url = new URL(`${defaultServerUrl.replace(/\/$/, "")}/events`);
        url.searchParams.set("ticket", ticket);
        source = new EventSource(url.toString());

        source.addEventListener("open", () => {
          retryCount = 0;
          if (hasConnectedBefore.current) {
            refetchAfterReconnect();
          }
          hasConnectedBefore.current = true;
          window.dispatchEvent(new CustomEvent("newchat:sse-reconnected"));
        });

        source.addEventListener("error", () => {
          if (cancelled) return;
          source?.close();
          source = null;
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            window.dispatchEvent(new CustomEvent("newchat:sse-disconnected"));
            return;
          }
          const delay = Math.min(2000 * Math.pow(1.5, retryCount - 1), 30_000);
          setTimeout(() => {
            if (!cancelled) connect();
          }, delay);
        });

        source.addEventListener("conversation_event", handleConversationEvent);
        source.addEventListener("membership", handleMembershipEvent);
        source.addEventListener("presence", handlePresenceEvent);
      } catch (err) {
        console.error("Failed to create SSE ticket", err);
        retryCount++;
        if (retryCount > MAX_RETRIES) {
          window.dispatchEvent(new CustomEvent("newchat:sse-disconnected"));
          return;
        }
        const delay = Math.min(5000 * Math.pow(1.5, retryCount - 1), 30_000);
        setTimeout(() => {
          if (!cancelled) connect();
        }, delay);
      }
    }

    const handleManualReconnect = () => {
      retryCount = 0;
      connect();
    };
    window.addEventListener("newchat:sse-reconnect", handleManualReconnect);

    connect();

    return () => {
      cancelled = true;
      window.removeEventListener("newchat:sse-reconnect", handleManualReconnect);
      if (source) {
        source.removeEventListener("conversation_event", handleConversationEvent);
        source.removeEventListener("membership", handleMembershipEvent);
        source.removeEventListener("presence", handlePresenceEvent);
        source.close();
      }
      typingTimers.current.forEach((timer) => clearTimeout(timer));
      typingTimers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, utils, user?.id, refetchAfterReconnect]);
}
