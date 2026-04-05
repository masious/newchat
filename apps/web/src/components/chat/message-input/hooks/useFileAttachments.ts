import { useCallback, useRef, useSyncExternalStore } from "react";
import { trpc } from "@/lib/trpc";
import { uploadFileWithProgress, type UploadedFile } from "@/lib/upload";
import {
  addPendingFiles,
  removePendingFile,
  updateUploadProgress,
  markUploadDone,
  markUploadError,
  clearConversationUploads,
  setAbortController,
  getUploadsForConversation,
  getSnapshotVersion,
  subscribeToUploads,
  type UploadEntry,
} from "@/lib/upload-store";

type TRPCUtils = ReturnType<typeof trpc.useUtils>;

export type UploadEntryWithId = UploadEntry & { id: string };

export function useFileAttachments(conversationId: number) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to the module-level store via useSyncExternalStore
  const snapshot = useSyncExternalStore(subscribeToUploads, getSnapshotVersion);

  // Derive entries for this conversation from the store
  const convUploads = getUploadsForConversation(conversationId);
  const entries: UploadEntryWithId[] = [];
  if (convUploads) {
    for (const [id, entry] of convUploads.entries) {
      entries.push({ id, ...entry });
    }
  }

  const isUploading = entries.some(
    (e) => e.status === "uploading" || e.status === "pending",
  );

  // For backward compat: expose the File[] list for code that needs it
  const pendingFiles = entries.map((e) => e.file);

  const addFiles = useCallback(
    (files: File[]) => {
      addPendingFiles(conversationId, files);
    },
    [conversationId],
  );

  const removeFile = useCallback(
    (fileId: string) => {
      removePendingFile(conversationId, fileId);
    },
    [conversationId],
  );

  const uploadFiles = useCallback(
    async (utils: TRPCUtils): Promise<UploadedFile[]> => {
      const conv = getUploadsForConversation(conversationId);
      if (!conv || conv.entries.size === 0) return [];

      const controller = new AbortController();
      setAbortController(conversationId, controller);

      const entryList = Array.from(conv.entries.entries());

      const results = await Promise.allSettled(
        entryList.map(async ([fileId, entry]) => {
          const result = await uploadFileWithProgress(
            entry.file,
            utils,
            (percent) => {
              updateUploadProgress(conversationId, fileId, percent);
            },
            controller.signal,
          );
          markUploadDone(conversationId, fileId, result);
          return result;
        }),
      );

      // Collect successful uploads, mark failures
      const uploaded: UploadedFile[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === "fulfilled") {
          uploaded.push(result.value);
        } else {
          const [fileId] = entryList[i];
          const errorMsg =
            result.reason instanceof Error
              ? result.reason.message
              : "Upload failed";
          markUploadError(conversationId, fileId, errorMsg);
        }
      }

      // If every upload failed, throw so the caller's catch block fires
      if (uploaded.length === 0 && entryList.length > 0) {
        throw new Error("All uploads failed");
      }

      return uploaded;
    },
    [conversationId],
  );

  const resetFiles = useCallback(() => {
    clearConversationUploads(conversationId);
  }, [conversationId]);

  // Suppress unused-variable warning — snapshot is read to trigger re-render
  void snapshot;

  return {
    entries,
    pendingFiles,
    isUploading,
    fileInputRef,
    addFiles,
    removeFile,
    uploadFiles,
    resetFiles,
  };
}
