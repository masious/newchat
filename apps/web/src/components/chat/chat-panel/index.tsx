"use client";

import {
  useCallback,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import {
  List,
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
} from "react-virtualized";
import type { ListRowProps } from "react-virtualized";
import "react-virtualized/styles.css";
import { useAuth } from "@/lib/providers/auth-context";
import { isOptimisticMessage } from "@/lib/trpc-types";
import { MessageBubble } from "../message-bubble";
import { MessageInput, type MessageInputHandle } from "../message-input";
import type { Attachment } from "../message-bubble/components/AttachmentPreview";
import { formatDateSeparator, isSameDay } from "@/lib/formatting";
import { useTimeTick } from "@/lib/hooks/use-relative-time";
import { cn } from "@/lib/cn";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { ChatHeader } from "./components/ChatHeader";
import { DragOverlay } from "./components/DragOverlay";
import { LoadingMessages } from "./components/LoadingMessages";
import { EmptyMessages } from "./components/EmptyMessages";
import { DateSeparator } from "./components/DateSeparator";
import { useMarkReadOnVisible } from "./hooks/useMarkReadOnVisible";
import { useVirtualizedMessages } from "./hooks/useVirtualizedMessages";
import type { ChatListContext } from "./types";
import LoadingHeader from "./components/LoadingHeader";
import TypingFooter from "./components/TypingFooter";

const HEADER_ROW_COUNT = 1;
const AT_BOTTOM_THRESHOLD = 50;

export function ChatPanel({
  conversationId,
  conversationName,
  isTyping,
  typingUserName,
  onOpenSidebar,
  otherMemberId,
}: {
  conversationId: number;
  conversationName: string;
  isTyping?: boolean;
  typingUserName: string | null;
  onOpenSidebar?: () => void;
  otherMemberId?: number;
}) {
  const { user } = useAuth();
  useTimeTick();
  const { observeRef } = useMarkReadOnVisible(conversationId, user?.id);
  const inputRef = useRef<MessageInputHandle>(null);
  const listRef = useRef<List>(null);

  const dragAndDrop = useDragAndDrop((files) => {
    inputRef.current?.addFiles(files);
  });

  const {
    messagesQuery,
    flatMessages,
    prevMessageCountRef,
    handleScrollNearTop,
  } = useVirtualizedMessages(conversationId);

  // Keep a ref to flatMessages for keyMapper access during cache operations
  const flatMessagesRef = useRef(flatMessages);
  flatMessagesRef.current = flatMessages;

  // CellMeasurer cache — keyMapper uses message ID so cache survives prepends
  const [cache] = useState(
    () =>
      new CellMeasurerCache({
        defaultHeight: 80,
        fixedWidth: true,
        keyMapper: (rowIndex: number) => {
          if (rowIndex === 0) return "__header__";
          const msg = flatMessagesRef.current[rowIndex - HEADER_ROW_COUNT];
          return msg ? msg.id : `__unknown_${rowIndex}__`;
        },
      }),
  );

  // Reset cache on conversation switch
  useEffect(() => {
    cache.clearAll();
  }, [conversationId, cache]);

  // Scroll state
  const [atBottom, setAtBottom] = useState(true);
  const atBottomRef = useRef(true);
  atBottomRef.current = atBottom;
  const scrollTopRef = useRef(0);

  const totalRowCount = HEADER_ROW_COUNT + flatMessages.length;

  // Scroll handler: at-bottom detection + near-top infinite loading
  const handleScroll = useCallback(
    ({
      scrollTop,
      clientHeight,
      scrollHeight,
    }: {
      scrollTop: number;
      clientHeight: number;
      scrollHeight: number;
    }) => {
      scrollTopRef.current = scrollTop;
      const isAtBottom =
        scrollTop + clientHeight >= scrollHeight - AT_BOTTOM_THRESHOLD;
      setAtBottom(isAtBottom);

      handleScrollNearTop(scrollTop);
    },
    [handleScrollNearTop],
  );

  // Scroll preservation when older messages are prepended
  useLayoutEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const newCount = flatMessages.length;

    if (newCount > prevCount && !atBottomRef.current) {
      const prependedCount = newCount - prevCount;
      let addedHeight = 0;
      for (let i = HEADER_ROW_COUNT; i < HEADER_ROW_COUNT + prependedCount; i++) {
        addedHeight += cache.getHeight(i, 0) || 80;
      }
      const savedScrollTop = scrollTopRef.current;
      requestAnimationFrame(() => {
        if (listRef.current) {
          const grid = listRef.current.Grid;
          if (grid) {
            (
              grid as unknown as {
                scrollToPosition: (opts: { scrollTop: number }) => void;
              }
            ).scrollToPosition({
              scrollTop: savedScrollTop + addedHeight,
            });
          }
        }
      });
    }

    prevMessageCountRef.current = newCount;
  }, [flatMessages.length, cache, prevMessageCountRef]);

  // Auto-scroll to bottom when new messages arrive and user is at bottom
  const prevTotalRef = useRef(totalRowCount);
  useEffect(() => {
    const prev = prevTotalRef.current;
    prevTotalRef.current = totalRowCount;

    if (totalRowCount > prev && atBottomRef.current && listRef.current) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToRow(totalRowCount - 1);
      });
    }
  }, [totalRowCount]);

  // Context for header/footer
  const listContext: ChatListContext = useMemo(
    () => ({
      isTyping,
      typingUserName,
      isFetchingOlder: messagesQuery.isFetchingNextPage,
      hasOlderMessages: messagesQuery.hasNextPage ?? false,
    }),
    [isTyping, typingUserName, messagesQuery.isFetchingNextPage, messagesQuery.hasNextPage],
  );

  const rowRenderer = useCallback(
    ({ index, key, parent, style }: ListRowProps) => {
      // Row 0 = loading header
      if (index === 0) {
        return (
          <CellMeasurer
            cache={cache}
            columnIndex={0}
            key={key}
            parent={parent}
            rowIndex={index}
          >
            {({ registerChild }) => (
              <div
                ref={registerChild as React.Ref<HTMLDivElement>}
                style={style}
              >
                <LoadingHeader context={listContext} />
              </div>
            )}
          </CellMeasurer>
        );
      }

      // Message rows
      const messageIndex = index - HEADER_ROW_COUNT;
      const message = flatMessages[messageIndex];
      if (!message) return null;

      const isMine = message.sender.id === user?.id;
      const prev = messageIndex > 0 ? flatMessages[messageIndex - 1] : null;
      const showDateSeparator =
        !prev || !isSameDay(prev.createdAt, message.createdAt);
      const optimistic = isOptimisticMessage(message);

      return (
        <CellMeasurer
          cache={cache}
          columnIndex={0}
          key={key}
          parent={parent}
          rowIndex={index}
        >
          {({ registerChild, measure }) => (
            <div
              ref={registerChild as React.Ref<HTMLDivElement>}
              style={style}
            >
              <div
                className={cn(
                  "px-4 pb-3 md:px-6",
                  optimistic && "animate-message-send",
                )}
                ref={
                  optimistic
                    ? undefined
                    : (el) => observeRef(el, message.id, message.sender.id)
                }
              >
                <div className="mx-auto max-w-3xl">
                  {showDateSeparator && (
                    <DateSeparator
                      label={formatDateSeparator(message.createdAt)}
                    />
                  )}
                  <MessageBubble
                    content={message.content ?? null}
                    createdAt={message.createdAt}
                    isMine={isMine}
                    readByOthers={Boolean(
                      (message as { readByOthers?: boolean }).readByOthers,
                    )}
                    attachments={
                      (message as { attachments?: Attachment[] | null })
                        .attachments
                    }
                    isPending={optimistic && message._status === "pending"}
                    isFailed={optimistic && message._status === "failed"}
                    onImageLoad={measure}
                  />
                </div>
              </div>
            </div>
          )}
        </CellMeasurer>
      );
    },
    [cache, flatMessages, user?.id, observeRef, listContext],
  );

  const headerContent = (
    <ChatHeader
      conversationName={conversationName}
      isTyping={isTyping}
      typingUserName={typingUserName}
      onOpenSidebar={onOpenSidebar}
      otherMemberId={otherMemberId}
    />
  );

  if (messagesQuery.isLoading) {
    return (
      <section className="relative flex h-full flex-1 flex-col">
        {headerContent}
        <div className="flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            <LoadingMessages />
          </div>
        </div>
        <MessageInput ref={inputRef} conversationId={conversationId} />
      </section>
    );
  }

  if (flatMessages.length === 0) {
    return (
      <section className="relative flex h-full flex-1 flex-col">
        {headerContent}
        <div className="flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            <EmptyMessages />
          </div>
        </div>
        <MessageInput ref={inputRef} conversationId={conversationId} />
      </section>
    );
  }

  return (
    <section
      className="relative flex h-full flex-1 flex-col"
      onDragEnter={dragAndDrop.handleDragEnter}
      onDragLeave={dragAndDrop.handleDragLeave}
      onDragOver={dragAndDrop.handleDragOver}
      onDrop={dragAndDrop.handleDrop}
    >
      {dragAndDrop.isDragOver && <DragOverlay />}
      {headerContent}

      <div style={{ flex: 1 }}>
        <AutoSizer>
          {({ width, height }) => (
            <List
              key={conversationId}
              ref={listRef}
              width={width}
              height={height}
              rowCount={totalRowCount}
              deferredMeasurementCache={cache}
              rowHeight={cache.rowHeight}
              rowRenderer={rowRenderer}
              onScroll={handleScroll}
              overscanRowCount={5}
              scrollToIndex={totalRowCount - 1}
              scrollToAlignment="end"
            />
          )}
        </AutoSizer>
      </div>

      <TypingFooter context={listContext} />
      <MessageInput ref={inputRef} conversationId={conversationId} />
    </section>
  );
}
