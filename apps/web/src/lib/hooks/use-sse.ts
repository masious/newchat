"use client";

import { useEffect, useRef, useCallback } from "react";
import { trpc } from "../trpc";
import { useAuth } from "../providers/auth-context";
import {
  handleNewMessage,
  handleTyping,
  handleMessageRead,
  handleMembership,
  handlePresence,
} from "../sse-cache-updaters";

const defaultServerUrl =
  process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

const MAX_RETRIES = 10;

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
          handleNewMessage(utils, user, detail, typingTimers.current);
        } else if (detail.type === "typing") {
          handleTyping(utils, detail, user?.id, typingTimers.current);
        } else if (detail.type === "message_read") {
          handleMessageRead(utils, detail, user?.id);
        }
      } catch (error) {
        console.error("Failed to process SSE conversation event", error);
      }
    };

    const handleMembershipEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data ?? "{}");
        if (!payload) return;
        handleMembership(utils, payload);
      } catch (error) {
        console.error("Failed to process SSE membership event", error);
      }
    };

    const handlePresenceEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data ?? "{}");
        if (!payload) return;
        handlePresence(utils, payload);
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
