import type { UploadedFile } from "./upload";

export type UploadEntry = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  result?: UploadedFile;
  error?: string;
};

type ConversationUploads = {
  entries: Map<string, UploadEntry>;
  abortController: AbortController | null;
};

const store = new Map<number, ConversationUploads>();
const listeners = new Set<() => void>();

// Snapshot counter — incremented on every mutation so useSyncExternalStore detects changes
let snapshotVersion = 0;

function notify() {
  snapshotVersion++;
  listeners.forEach((fn) => fn());
}

export function getSnapshotVersion() {
  return snapshotVersion;
}

export function getUploadsForConversation(conversationId: number): ConversationUploads | undefined {
  return store.get(conversationId);
}

export function addPendingFiles(conversationId: number, files: File[]): void {
  let entry = store.get(conversationId);
  if (!entry) {
    entry = { entries: new Map(), abortController: null };
    store.set(conversationId, entry);
  }
  for (const file of files) {
    const id = crypto.randomUUID();
    entry.entries.set(id, { file, progress: 0, status: "pending" });
  }
  notify();
}

export function removePendingFile(conversationId: number, fileId: string): void {
  const entry = store.get(conversationId);
  if (!entry) return;
  entry.entries.delete(fileId);
  if (entry.entries.size === 0) {
    store.delete(conversationId);
  }
  notify();
}

export function updateUploadProgress(conversationId: number, fileId: string, progress: number): void {
  const entry = store.get(conversationId);
  if (!entry) return;
  const file = entry.entries.get(fileId);
  if (file) {
    file.progress = progress;
    file.status = "uploading";
  }
  notify();
}

export function markUploadDone(conversationId: number, fileId: string, result: UploadedFile): void {
  const entry = store.get(conversationId);
  if (!entry) return;
  const file = entry.entries.get(fileId);
  if (file) {
    file.status = "done";
    file.result = result;
    file.progress = 100;
  }
  notify();
}

export function markUploadError(conversationId: number, fileId: string, error: string): void {
  const entry = store.get(conversationId);
  if (!entry) return;
  const file = entry.entries.get(fileId);
  if (file) {
    file.status = "error";
    file.error = error;
  }
  notify();
}

export function clearConversationUploads(conversationId: number): void {
  store.delete(conversationId);
  notify();
}

export function setAbortController(conversationId: number, controller: AbortController): void {
  const entry = store.get(conversationId);
  if (entry) {
    entry.abortController = controller;
  }
}

export function subscribeToUploads(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
