type PendingEntry = {
  optimisticId: string;
  negativeId: number;
  conversationId: number;
  content: string | null;
  sentAt: number;
};

const pendingMessages = new Map<string, PendingEntry>();

export function registerOptimisticMessage(entry: PendingEntry) {
  pendingMessages.set(entry.optimisticId, entry);
}

export function findAndRemoveOptimistic(
  conversationId: number,
  realMessage: { content: string | null },
): PendingEntry | null {
  for (const [key, entry] of pendingMessages) {
    if (
      entry.conversationId === conversationId &&
      entry.content === realMessage.content
    ) {
      pendingMessages.delete(key);
      return entry;
    }
  }
  return null;
}

export function markOptimisticFailed(optimisticId: string) {
  pendingMessages.delete(optimisticId);
}

/** Remove entries older than 30 seconds (safety net) */
export function cleanupStale() {
  const now = Date.now();
  for (const [key, entry] of pendingMessages) {
    if (now - entry.sentAt > 30_000) {
      pendingMessages.delete(key);
    }
  }
}
