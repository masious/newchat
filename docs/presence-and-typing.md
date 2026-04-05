# Presence & Typing Indicators

Both systems share the same architecture: server publishes to a Redis channel, SSE delivers to clients, client updates the React Query cache.

---

## Presence

### How Presence is Stored

```
Redis key: presence:{userId}
Value: JSON { status: "online"|"offline", lastSeen: "ISO8601" }
TTL: 300 seconds (5 minutes)
```

Defined in `apps/server/src/lib/presence.ts`.

### Presence Lifecycle

```
SSE connected    -> markOnline(userId)  -> SET key + PUBLISH presence:updates
Every 60 seconds -> setPresenceStatus() -> SET key (refresh TTL)
SSE disconnected -> markOffline(userId) -> SET key + PUBLISH presence:updates
Key expires      -> (user is implicitly offline — getPresenceStatus returns offline)
```

### Querying Presence

Three tRPC endpoints serve presence (`apps/server/src/trpc/routers/users.ts`):

| Endpoint            | Input                | Returns                                              |
|---------------------|----------------------|------------------------------------------------------|
| `users.profile`     | `{ userId }`         | Full user profile + `presence: PresenceStatus`       |
| `users.search`      | `{ query, limit? }`  | Array of users, each enriched with `presence`        |
| `users.presence`    | `{ userIds: [...] }` | `{ entries: [{ userId, presence }] }`                |

### Client-Side Presence Display

- **Chat header** (`ChatHeader.tsx`) polls `users.presence` every 60 seconds for the DM partner
- Displays: `"online"` or `"last seen X minutes ago"` (or nothing if user never connected)
- **SSE presence events** invalidate the cached presence queries -> trigger refetch

### Presence Data Shape

```typescript
type PresenceStatus = {
  status: "online" | "offline";
  lastSeen: string;  // ISO 8601
};
```

Default (never connected): `{ status: "offline", lastSeen: "1970-01-01T00:00:00.000Z" }`

---

## Typing Indicators

### Sending Typing Events

Client (`apps/web/src/components/chat/message-input/hooks/useTypingIndicator.ts`):

```
User types in textarea
  ──> notifyTyping() called on every onChange
  ──> Throttled: skip if last notification was < 2 seconds ago
  ──> trpc messages.typing({ conversationId })

Server (messages.ts:185-195):
  1. ensureConversationMember
  2. publishConversationEvent(conversationId, { type: "typing", conversationId, userId })
     -> Redis PUBLISH to conversation:{conversationId}
```

### Receiving Typing Events

Client (`use-sse.ts:136-165`):

```
SSE conversation_event with payload.type === "typing"
  ──> Ignore if userId === current user
  ──> Update conversations.list cache:
      set isTyping = true, typingUserId = payload.userId
  ──> Set/reset 3-second timer per conversationId
  ──> After 3 seconds with no new typing event:
      set isTyping = false, typingUserId = undefined
```

### Typing Indicator Cleared On

1. **Timeout**: 3 seconds of no new typing events
2. **New message arrives**: The `new_message` handler clears typing for that conversation
3. **Component unmount**: All typing timers are cleared

### Where Typing is Displayed

| Location                | What Shows                                    | File                          |
|-------------------------|-----------------------------------------------|-------------------------------|
| Chat header subtitle    | `"{name} is typing..."`                       | `ChatHeader.tsx`              |
| Chat panel footer       | Animated bouncing dots bubble                 | `TypingFooter.tsx` + `TypingBubble.tsx` |
| Conversation sidebar    | `"Typing..."` replaces last message preview   | `conversation-sidebar/index.tsx` |

Typing status takes precedence over presence in the chat header subtitle.
