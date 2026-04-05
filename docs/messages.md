# Messages & Read Receipts

## Sending a Message

```
Web (MessageInput) ──> Optimistic insert into React Query cache
                   ──trpc──> messages.send({ conversationId, content, attachments? })

Server (apps/server/src/trpc/routers/messages.ts:70-150):
  1. ensureConversationMember (authorization check)
  2. INSERT messages { conversationId, senderId, content, attachments }
  3. INSERT readReceipts for sender (auto-read own message)
  4. fetchMessageWithSender(messageId) -> joins with users table
  5. publishConversationEvent(conversationId, { type: "new_message", message })
     -> Redis PUBLISH to conversation:{conversationId}
  6. Background: send push notifications to other members
  7. Return { message }
```

## Optimistic Messages (Client)

The client maintains an in-memory optimistic message store (`apps/web/src/lib/optimistic-messages.ts`):

```typescript
type PendingEntry = {
  optimisticId: string;    // nanoid
  negativeId: number;      // negative integer for temp ID
  conversationId: number;
  content: string | null;
  sentAt: number;          // Date.now()
};
```

**Flow:**
1. Before tRPC call: register optimistic message + insert into React Query cache with negative temp ID
2. When SSE delivers `new_message`: `findAndRemoveOptimistic()` matches by conversationId + content
3. If match found: replace the temp message in-place (swap negativeId -> real ID)
4. If no match: prepend to first page (message from another user)
5. Safety net: `cleanupStale()` removes entries older than 30 seconds

## Message Delivery via SSE

When `conversation_event` with `type: "new_message"` arrives on the client (`use-sse.ts:43-135`):

1. **Messages cache**: Insert message into `messages.list` infinite query data (first page)
2. **Conversations cache**: Update `conversations.list`:
   - Set `lastMessage` on the matching conversation
   - Increment `unreadCount` if sender is not current user
   - Re-sort conversations by most recent activity
3. **Clear typing**: Remove any active typing indicator for this conversation
4. **Notify**: Dispatch `newchat:new-message` CustomEvent (for notification sound)

## Message List Pagination

```
messages.list({ conversationId, cursor?, limit? })
  - Default limit: 25
  - Cursor: message ID (fetch messages with id < cursor)
  - Returns: { messages: [...], nextCursor: number | undefined }
  - Ordered: DESC by createdAt (newest first from DB)
  - Client reverses to ASC for display (oldest at top)
```

Client uses `useInfiniteQuery` with cursor-based pagination. Fetches next page when scroll is near top (within 200px threshold). See `apps/web/src/components/chat/chat-panel/hooks/useVirtualizedMessages.ts`.

---

## Read Receipts

### Schema

```sql
read_receipts: { message_id, user_id, read_at } -- composite PK (message_id, user_id)
```

### Marking Messages as Read

The client uses `IntersectionObserver` to detect which messages are visible (`apps/web/src/components/chat/chat-panel/hooks/useMarkReadOnVisible.ts`):

```
Message becomes visible (50% threshold)
  ──> Collect messageId in pending set
  ──> Debounce 300ms
  ──> trpc messages.markRead({ conversationId, messageIds: [...] })

Server:
  1. ensureConversationMember
  2. Validate all messageIds belong to the conversation
  3. INSERT read_receipts (batch, upsert with ON CONFLICT)
  4. publishConversationEvent(conversationId, {
       type: "message_read",
       conversationId,
       messageIds: [...],
       userId
     })
```

Key behaviors:
- Skips messages sent by the current user (`senderId === userId`)
- Debounces to batch multiple visible messages into one request
- Flushes pending reads on unmount or conversation change
- Max 100 messageIds per request

### Read Receipt Delivery via SSE

When `conversation_event` with `type: "message_read"` arrives (`use-sse.ts:166-194`):

1. **Messages cache**: Set `readByOthers: true` on matching messages (only if sender is not the reader)
2. **Conversations cache**: Set `unreadCount: 0` for the conversation (the reader has caught up)
