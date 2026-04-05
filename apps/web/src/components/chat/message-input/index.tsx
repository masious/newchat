"use client";

import {
  ChangeEvent,
  forwardRef,
  KeyboardEvent,
  SubmitEvent,
  useImperativeHandle,
  useState,
} from "react";
import { SendHorizontal } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/providers/auth-context";
import { addToast } from "@/lib/providers/toast-context";
import type { UploadedFile } from "@/lib/upload";
import {
  registerOptimisticMessage,
  markOptimisticFailed,
} from "@/lib/optimistic-messages";
import type { OptimisticMessage } from "@/lib/trpc-types";
import { useTypingIndicator } from "./hooks/useTypingIndicator";
import { useAutoResizeTextarea } from "./hooks/useAutoResizeTextarea";
import { useFileAttachments } from "./hooks/useFileAttachments";
import { AttachButton } from "./components/AttachButton";
import { EmojiButton } from "./components/EmojiButton";
import { MessageTextarea } from "./components/MessageTextarea";
import { PendingAttachments } from "./components/PendingAttachments";
import type { MessageInputHandle } from "./types";

export type { MessageInputHandle };

export const MessageInput = forwardRef<
  MessageInputHandle,
  { conversationId: number }
>(function MessageInput({ conversationId }, ref) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const [message, setMessage] = useState("");

  const { notifyTyping, resetTypingThrottle } =
    useTypingIndicator(conversationId);
  const { textareaRef, resetHeight } = useAutoResizeTextarea(message);
  const fileHandlers = useFileAttachments();

  useImperativeHandle(ref, () => ({
    addFiles: fileHandlers.addFiles,
  }));

  const sendMessage = trpc.messages.send.useMutation();

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    notifyTyping();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;

    const isDesktop = window.matchMedia("(min-width: 768px)").matches;

    if (isDesktop && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      // Desktop: plain Enter sends, Shift/Ctrl/Meta+Enter inserts newline
      event.preventDefault();
      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
    // Mobile: Enter always inserts newline (default behavior)
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    fileHandlers.addFiles(Array.from(files));
    setTimeout(() => {
      event.target.value = "";
    });
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hasText = message.trim().length > 0;
    const hasFiles = fileHandlers.pendingFiles.length > 0;
    if (!hasText && !hasFiles) return;
    if (!user) return;

    let attachments: UploadedFile[] | undefined;

    if (hasFiles) {
      try {
        attachments = await fileHandlers.uploadFiles(utils);
      } catch {
        addToast("Failed to upload file");
        return;
      }
    }

    const trimmedContent = message.trim();
    const optimisticId = crypto.randomUUID();
    const negativeId = -(Date.now());
    const now = new Date().toISOString();

    const optimisticMessage: OptimisticMessage = {
      id: negativeId,
      conversationId,
      content: trimmedContent || "",
      attachments: attachments ?? null,
      createdAt: now,
      sender: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        avatarUrl: user.avatarUrl,
      },
      _optimisticId: optimisticId,
      _status: "pending",
    };

    // Clear input immediately
    setMessage("");
    fileHandlers.resetFiles();
    resetHeight();
    resetTypingThrottle();

    // Insert optimistic message into cache
    utils.messages.list.setInfiniteData(
      { conversationId },
      (current) => {
        if (!current) return current;
        const firstPage = current.pages[0];
        return {
          pages: [
            {
              ...firstPage,
              messages: [
                optimisticMessage as unknown as (typeof firstPage.messages)[number],
                ...firstPage.messages,
              ],
            },
            ...current.pages.slice(1),
          ],
          pageParams: current.pageParams,
        };
      },
    );

    // Register for SSE deduplication
    registerOptimisticMessage({
      optimisticId,
      negativeId,
      conversationId,
      content: trimmedContent || null,
      sentAt: Date.now(),
    });

    // Fire mutation
    try {
      await sendMessage.mutateAsync({
        conversationId,
        content: trimmedContent,
        attachments,
      });
    } catch (err) {
      markOptimisticFailed(optimisticId);
      utils.messages.list.setInfiniteData(
        { conversationId },
        (current) => {
          if (!current) return current;
          return {
            pages: current.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg.id === negativeId
                  ? { ...msg, _status: "failed" }
                  : msg,
              ),
            })),
            pageParams: current.pageParams,
          };
        },
      );
      const message =
        err instanceof Error ? err.message : "Failed to send message";
      addToast(message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t dark:bg-slate-800 border-slate-200 dark:border-slate-700"
    >
      <PendingAttachments
        files={fileHandlers.pendingFiles}
        onRemove={fileHandlers.removeFile}
        uploadProgress={fileHandlers.uploadProgress}
      />
      <div className="mx-auto flex items-center max-w-3xl gap-2 px-2 py-2 md:gap-3 md:px-2 md:py-4">
        <AttachButton
          fileInputRef={fileHandlers.fileInputRef}
          onFileSelect={handleFileSelect}
        />
        <MessageTextarea
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
        />
        <div className="hidden md:block size-9 p-2">
          <EmojiButton
            onEmojiSelect={(emoji) => {
              setMessage((prev) => prev + emoji);
            }}
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center rounded-full bg-indigo-600 p-2 text-white transition-opacity hover:opacity-80 active:opacity-60 md:hidden"
        >
          <SendHorizontal size={20} />
        </button>
      </div>
    </form>
  );
});
