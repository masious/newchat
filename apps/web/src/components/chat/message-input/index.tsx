"use client";

import {
  ChangeEvent,
  forwardRef,
  KeyboardEvent,
  SubmitEvent,
  useImperativeHandle,
  useState,
} from "react";
import { trpc } from "@/lib/trpc";
import { addToast } from "@/lib/toast-context";
import type { UploadedFile } from "@/lib/upload";
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
  const [message, setMessage] = useState("");

  const { notifyTyping, resetTypingThrottle } =
    useTypingIndicator(conversationId);
  const { textareaRef, resetHeight } = useAutoResizeTextarea(message);
  const fileHandlers = useFileAttachments();

  useImperativeHandle(ref, () => ({
    addFiles: fileHandlers.addFiles,
  }));

  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessage("");
      fileHandlers.resetFiles();
      resetHeight();
      resetTypingThrottle();
    },
    onError: (err) => {
      addToast(err.message || "Failed to send message");
    },
  });

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    notifyTyping();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
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

    let attachments: UploadedFile[] | undefined;

    if (hasFiles) {
      try {
        attachments = await fileHandlers.uploadFiles(utils);
      } catch {
        addToast("Failed to upload file");
        return;
      }
    }

    sendMessage.mutate({
      conversationId,
      content: message.trim(),
      attachments,
    });
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
      <div className="mx-auto flex items-center max-w-3xl gap-2 px-4 py-3 md:gap-3 md:px-6 md:py-4">
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
        <div className="hidden md:block">
          <EmojiButton
            onEmojiSelect={(emoji) => {
              setMessage((prev) => prev + emoji);
            }}
          />
        </div>
      </div>
    </form>
  );
});
