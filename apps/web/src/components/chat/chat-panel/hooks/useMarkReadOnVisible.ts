"use client";

import { useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

const DEBOUNCE_MS = 300;

export function useMarkReadOnVisible(
  conversationId: number,
  userId: number | undefined,
) {
  const markRead = trpc.messages.markRead.useMutation();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const pendingIdsRef = useRef<Set<number>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable ref to latest values for use in callbacks without re-creating the observer
  const stableRef = useRef({ conversationId, userId, markRead });
  stableRef.current = { conversationId, userId, markRead };

  const flushMarkRead = useCallback(() => {
    const { conversationId: convId, userId: uid, markRead: mutation } = stableRef.current;
    const ids = Array.from(pendingIdsRef.current);
    if (ids.length > 0 && uid) {
      pendingIdsRef.current.clear();
      mutation.mutate({ conversationId: convId, messageIds: ids });
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(flushMarkRead, DEBOUNCE_MS);
  }, [flushMarkRead]);

  // Create/recreate observer when conversation or user changes
  useEffect(() => {
    pendingIdsRef.current.clear();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const uid = stableRef.current.userId;
        let changed = false;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const messageId = Number(el.dataset.messageId);
          const senderId = Number(el.dataset.senderId);
          if (!messageId || senderId === uid) continue;
          if (!pendingIdsRef.current.has(messageId)) {
            pendingIdsRef.current.add(messageId);
            changed = true;
          }
        }
        if (changed) {
          scheduleFlush();
        }
      },
      { root: null, threshold: 0.5 },
    );

    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [conversationId, userId, scheduleFlush]);

  // Flush pending read receipts on unmount or conversation change
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      flushMarkRead();
    };
  }, [conversationId, userId, flushMarkRead]);

  const observeRef = useCallback(
    (el: HTMLElement | null, messageId: number, senderId: number) => {
      const observer = observerRef.current;
      if (!observer || !el) return;
      if (senderId === stableRef.current.userId) return;

      el.dataset.messageId = String(messageId);
      el.dataset.senderId = String(senderId);
      observer.observe(el);
    },
    [],
  );

  return { observeRef };
}
