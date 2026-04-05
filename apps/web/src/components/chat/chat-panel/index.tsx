"use client";

import { useCallback, useRef } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { useAuth } from "@/lib/auth-context";
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
import { VirtuosoContext } from "./types";
import LoadingHeader from "./components/LoadingHeader";
import TypingFooter from "./components/TypingFooter";

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
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const dragAndDrop = useDragAndDrop((files) => {
    inputRef.current?.addFiles(files);
  });

  const {
    messagesQuery,
    flatMessages,
    firstItemIndex,
    setAtBottom,
    handleStartReached,
  } = useVirtualizedMessages(conversationId);

  const handleFollowOutput = useCallback(
    (isAtBottom: boolean) => (isAtBottom ? "smooth" : false) as "smooth" | false,
    [],
  );

  const renderItem = useCallback(
    (index: number) => {
      const arrayIndex = index - firstItemIndex;
      const message = flatMessages[arrayIndex];
      if (!message) return null;
      const isMine = message.sender.id === user?.id;
      const prev = arrayIndex > 0 ? flatMessages[arrayIndex - 1] : null;
      const showDateSeparator =
        !prev || !isSameDay(prev.createdAt, message.createdAt);
      const optimistic = isOptimisticMessage(message);

      return (
        <div
          className={cn("px-4 pb-3 md:px-6", optimistic && "animate-message-send")}
          ref={
            optimistic
              ? undefined
              : (el) => observeRef(el, message.id, message.sender.id)
          }
        >
          <div className="mx-auto max-w-3xl">
            {showDateSeparator && (
              <DateSeparator label={formatDateSeparator(message.createdAt)} />
            )}
            <MessageBubble
              content={message.content ?? null}
              createdAt={message.createdAt}
              isMine={isMine}
              readByOthers={Boolean(
                (message as { readByOthers?: boolean }).readByOthers,
              )}
              attachments={
                (message as { attachments?: Attachment[] | null }).attachments
              }
              isPending={optimistic && message._status === "pending"}
              isFailed={optimistic && message._status === "failed"}
            />
          </div>
        </div>
      );
    },
    [firstItemIndex, flatMessages, user?.id, observeRef],
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

      <Virtuoso
        key={conversationId}
        ref={virtuosoRef}
        style={{ flexGrow: 1 }}
        data={flatMessages}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={flatMessages.length - 1}
        startReached={handleStartReached}
        followOutput={handleFollowOutput}
        atBottomStateChange={setAtBottom}
        atBottomThreshold={50}
        increaseViewportBy={{ top: 200, bottom: 0 }}
        context={{
          isTyping,
          typingUserName,
          isFetchingOlder: messagesQuery.isFetchingNextPage,
          hasOlderMessages: messagesQuery.hasNextPage ?? false,
        } satisfies VirtuosoContext}
        itemContent={renderItem}
        components={{
          Header: LoadingHeader,
          Footer: TypingFooter,
        }}
      />

      <MessageInput ref={inputRef} conversationId={conversationId} />
    </section>
  );
}
