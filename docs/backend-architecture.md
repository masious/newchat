# Backend Architecture

This document defines the architectural patterns and design decisions for the Hono + tRPC API server. It serves as a guide for how code should be structured — not just how it happens to look today.

## Layered Architecture

The server follows a three-layer architecture. Each layer has a single responsibility and a clear dependency direction: routers depend on services, services depend on data access. Never skip a layer.

```
┌─────────────────────────────────────────────────────────┐
│  Routers (trpc/routers/)                                │
│  Input validation, response shaping, error translation  │
│  Thin — no business logic lives here                    │
├─────────────────────────────────────────────────────────┤
│  Services (services/)                                   │
│  Business logic, orchestration, authorization           │
│  Owns the rules — "what should happen when X"           │
├─────────────────────────────────────────────────────────┤
│  Data Access (lib/ + direct Drizzle queries)            │
│  Database queries, Redis operations, external APIs      │
│  Reusable, composable, no business decisions            │
└─────────────────────────────────────────────────────────┘
```

### Routers — The Boundary

Routers are the entry point for every tRPC procedure. Their job:

1. **Validate input** — Zod schemas parse and constrain incoming data
2. **Call a service** — delegate all business logic
3. **Shape the response** — return only what the client needs
4. **Translate errors** — catch domain errors and map to tRPC error codes

A router should read like a table of contents. If a procedure body is longer than ~20 lines, business logic has leaked in and should be extracted to a service.

```typescript
// Good — router is a thin shell
send: protectedProcedure
  .input(sendMessageSchema)
  .mutation(async ({ ctx, input }) => {
    const message = await messageService.send(ctx.db, {
      conversationId: input.conversationId,
      senderId: ctx.userId,
      content: input.content,
      attachments: input.attachments,
    });
    return { message };
  }),

// Bad — business logic inline in router
send: protectedProcedure
  .input(sendMessageSchema)
  .mutation(async ({ ctx, input }) => {
    await ensureConversationMember(ctx.db, input.conversationId, ctx.userId);
    const [message] = await ctx.db.insert(messages).values({...}).returning();
    await ctx.db.insert(readReceipts).values({...});
    const full = await fetchMessageWithSender(ctx.db, message.id);
    await publishConversationEvent(input.conversationId, {...});
    // ... notification logic ...
    return { message: full };
  }),
```

### Services — The Business Logic

Services are plain async functions (not classes) that own the business rules. A service function represents a single use case: "send a message", "create a conversation", "mark messages as read".

Services:
- Receive a `db` handle and plain input objects (no tRPC context)
- Perform authorization checks (e.g., `ensureConversationMember`)
- Orchestrate multiple data access calls in the right order
- Publish events after successful writes
- Throw domain errors (not tRPC errors) when rules are violated
- Are unit-testable with a mocked `db`

```
services/
├── message-service.ts          # send, markRead — message lifecycle
├── conversation-service.ts     # create, listForUser — conversation lifecycle
├── notification-service.ts     # notifyUserOfMessage — fan-out to web push / Telegram
├── realtime-events.ts          # publishConversationEvent, publishMembershipChange
├── fetch-conversation-summaries.ts   # Read-optimized conversation list query
└── fetch-message.ts            # fetchMessageWithSender (message + user join)
```

### Data Access — The Foundation

Data access functions are reusable query builders. They handle:
- Drizzle ORM queries (inserts, selects, updates)
- Raw SQL for complex queries (e.g., conversation summaries with LATERAL JOINs)
- Redis reads/writes (presence, rate limits, tickets)
- External API calls (R2, Telegram Bot API, web push service)

Data access functions should be:
- **Composable** — a service can call multiple data access functions in sequence
- **Predictable** — same input always produces the same query
- **Free of business logic** — no authorization checks, no conditional branching based on user roles

```
lib/
├── jwt.ts                   # signToken, verifyToken
├── redis.ts                 # Publisher singleton + subscriber factory
├── presence.ts              # markOnline, markOffline, setPresenceStatus, getPresenceStatus
├── rate-limit.ts            # checkRateLimit (fixed-window counter)
├── r2.ts                    # R2 client, presigned URL generation
├── upload-constants.ts      # Allowed MIME types, max file size
├── logger.ts                # Pino structured logger (JSON, configurable via LOG_LEVEL)
├── web-push.ts              # VAPID setup, sendPushNotification
└── telegram-notifier.ts     # sendTelegramNotification
```

## Event-Driven Messaging Pattern

Real-time features (messages, typing, presence, membership changes) use an event-driven pattern built on Redis pub/sub. The core principle: **separate "publish event" from "react to event"**.

### Event Flow

```
Router/Service                  Redis Pub/Sub              SSE Handler              Client
─────────────                   ──────────────             ───────────              ──────

messages.send
  │
  ├─► INSERT message (DB)
  │
  ├─► PUBLISH to                ──► conversation:{id}  ──► Forward as SSE ────────► Update cache
  │   conversation:{id}             channel                 conversation_event       (messages, sidebar,
  │                                                                                  typing clear)
  └─► notifyUserOfMessage
      (fire-and-forget)             No pub/sub —            N/A                      Browser notification
      ├─► Web Push POST             direct HTTP to                                   or Telegram DM
      └─► Telegram Bot API          external services
```

### Event Types

All events published to Redis channels should conform to a typed structure. This makes the SSE handler a dumb pipe — it forwards events without interpreting them.

```typescript
// Conversation channel events (conversation:{id})
type ConversationEvent =
  | { type: "new_message"; conversationId: number; message: MessageWithSender }
  | { type: "typing"; conversationId: number; userId: number }
  | { type: "message_read"; conversationId: number; messageIds: number[]; userId: number };

// Membership channel events (user:{userId}:membership)
type MembershipEvent =
  | { type: "join"; conversationId: number; conversation: ConversationSummary }
  | { type: "leave"; conversationId: number };

// Presence channel events (presence:updates)
type PresenceEvent = {
  userId: number;
  status: "online" | "offline";
  lastSeen: string;
};
```

### Decoupling via Events

The "send message" service publishes a `new_message` event and returns. It does not:
- Know how many SSE connections will receive it
- Know whether the recipient has web push enabled
- Care if the notification fails

Notification delivery is a **separate concern** triggered after the write succeeds. It runs via `Promise.allSettled()` — fire-and-forget, never blocks the response.

This means:
- Adding a new reaction to events (e.g., "update unread badge") doesn't touch the send path
- Notification failures don't affect message delivery
- The system degrades gracefully — if Redis pub/sub is slow, messages still persist, they just arrive late via SSE

## Error Handling Strategy

Errors are categorized into two kinds: **domain errors** (business rule violations) and **infrastructure errors** (DB down, Redis timeout). Each is handled differently.

### Domain Errors

Services throw domain-specific errors. Routers catch and translate them to tRPC error codes.

| Domain Error | tRPC Code | When |
|---|---|---|
| User is not a conversation member | `FORBIDDEN` | Any conversation-scoped operation |
| Referenced users don't exist | `BAD_REQUEST` | Creating a group with invalid member IDs |
| Token expired or already used | `BAD_REQUEST` | Auth exchange with stale token |
| Rate limit exceeded | `TOO_MANY_REQUESTS` | Any procedure over its limit |
| Invalid input | `BAD_REQUEST` | Zod validation failure (automatic) |
| Not authenticated | `UNAUTHORIZED` | Missing or invalid JWT |

The `ensureConversationMember` helper is the primary authorization gate. It's called at the start of every conversation-scoped service function:

```
ensureConversationMember(db, conversationId, userId)
  → SELECT from conversation_members
  → If no row: throw FORBIDDEN
  → Returns the conversation (avoids a second query)
```

### Infrastructure Errors

Database and Redis failures propagate as unhandled exceptions. tRPC catches these and returns `INTERNAL_SERVER_ERROR`. The logging middleware records the failure with timing info.

For non-critical paths (notifications, presence refresh), errors are caught and logged silently — they should never crash the request:

```typescript
// Presence heartbeat — failure is acceptable
setPresenceStatus(userId, { status: "online", lastSeen: new Date().toISOString() })
  .catch((error) => logger.error({ error }, "Failed to refresh presence"));

// Notifications ��� never block the send response
await Promise.allSettled(notificationPromises);
```

### Error Response Shape

tRPC standardizes error responses. The client always receives:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Human-readable description"
  }
}
```

Rate limit errors additionally expose headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.

## Connection & Resource Management

### Redis Connections

Two connection patterns, each for a specific use case:

```
redisPublisher (1 connection, singleton)
  Used for: SET, INCR, EXPIRE, PUBLISH, GETDEL
  Shared across all request handlers and background jobs
  Created once on startup, never disconnected

redisSubscriber (1 connection per SSE stream)
  Used for: SUBSCRIBE only
  Created when SSE connection opens
  Subscribes to: conversation:{id}... + user:{id}:membership + presence:updates
  Disconnected when SSE stream closes
```

Why separate connections: ioredis (and Redis itself) requires a dedicated connection for subscriptions — once a connection enters subscriber mode, it can't run other commands. The publisher singleton avoids creating a new connection per request.

### SSE Connection Lifecycle

An SSE connection goes through distinct phases. Treating it as a state machine makes the cleanup logic predictable:

```
AUTHENTICATING                 SUBSCRIBING                    ACTIVE
─────────────                  ───────────                    ──────
Validate ticket (GETDEL)       Query user's conversations     Forwarding events
Check concurrency limit        Subscribe to Redis channels    Keepalive ping (30s)
                               Mark user online               Presence heartbeat (60s)
                               Send init event                Dynamic subscribe/unsubscribe
                                                              on membership changes

                                         │
                                         ▼ (on abort, max lifetime, or error)

                                       CLOSED
                                       ──────
                                       Clear keepalive interval
                                       Clear presence heartbeat
                                       Disconnect Redis subscriber
                                       Decrement connection count
                                       Mark user offline
```

Key safeguards:
- **Max connections per user**: 5 (prevents tab explosion from leaking connections)
- **Max lifetime**: 24 hours (forces reconnect, prevents stale subscriptions)
- **Keepalive ping**: Every 30 seconds (prevents proxies/load balancers from killing idle connections)
- **Concurrency tracking**: Redis key `sse:conn:{userId}` with 5-minute TTL (auto-heals if server crashes without cleanup)

### Graceful Shutdown

When the server process is killed (SIGTERM), active SSE streams should drain cleanly:
1. Stop accepting new connections
2. Close all SSE streams (triggers onAbort handlers)
3. Wait for onAbort cleanup (mark offline, decrement counts)
4. Disconnect the Redis publisher
5. Exit

## Scaling Considerations

### Stateless Server Design

The server is stateless — it can be horizontally scaled by running multiple instances behind a load balancer. All shared state lives externally:

| State | Where | Why |
|---|---|---|
| User sessions (JWT) | Client-side (localStorage) | Server only verifies, never stores |
| Messages, users, conversations | Neon PostgreSQL | Single source of truth |
| Presence, rate limits, SSE tickets | Redis | Ephemeral, TTL-based, auto-healing |
| Real-time event delivery | Redis pub/sub | Fan-out across server instances |
| File storage | Cloudflare R2 | Client uploads directly via presigned URLs |

### Multi-Instance Event Delivery

Redis pub/sub is the coordination layer. When Server A handles a `messages.send` call:

```
Server A (handles the API call)
  │
  ├─► INSERT message into Neon
  │
  └─► PUBLISH to Redis conversation:{id}
          │
          ├──► Server A's SSE connections (subscribers on this instance)
          ├──► Server B's SSE connections (subscribers on another instance)
          └──► Server C's SSE connections (subscribers on another instance)
```

Each server instance has its own set of SSE connections, each with its own Redis subscriber. Redis handles the fan-out — no direct server-to-server communication.

### What Doesn't Need Coordination

- **Rate limiting**: Each key is per-user or per-IP, and Redis `INCR` is atomic. Multiple instances hitting the same key is safe.
- **Presence**: `markOnline`/`markOffline` use Redis SET + PUBLISH. Last-write-wins is fine — presence is best-effort.
- **SSE tickets**: `GETDEL` is atomic. Only one instance can consume a ticket.
- **Connection counts**: Redis `INCR`/`DECR` is atomic. TTL auto-heals leaked counts.

### Sticky Sessions

Not required. SSE connections are independent — if a client reconnects, it gets a new ticket and can land on any server instance. The new instance subscribes to the same Redis channels and picks up from where the old connection left off.

## Testing Strategy

The layered architecture enables testing at each level independently.

### Unit Tests — Services

Services are the primary unit test target. They contain all business logic and can be tested with a mocked database:

```typescript
// Test: sending a message to a conversation you're not a member of
test("send throws FORBIDDEN for non-member", async () => {
  const mockDb = createMockDb({
    conversationMembers: [],  // user is not a member
  });

  await expect(
    messageService.send(mockDb, {
      conversationId: 1,
      senderId: 99,
      content: "hello",
    })
  ).rejects.toThrow(ForbiddenError);
});
```

What to test at this level:
- Authorization checks (member/non-member)
- Input edge cases (empty content, max attachments)
- Event publishing (verify the right event is published after a write)
- Error paths (expired tokens, duplicate DMs)

### Integration Tests — Data Access

Test actual database queries against a real PostgreSQL instance (local Docker or test database):

```typescript
// Test: conversation summary query returns correct unread count
test("unread count excludes own messages", async () => {
  // Seed: 3 messages in conversation, 2 from other user, 1 read receipt
  const summaries = await fetchConversationSummaries(db, userId);
  expect(summaries[0].unreadCount).toBe(1);  // 2 from other - 1 read = 1 unread
});
```

What to test at this level:
- Complex queries (conversation summaries with LATERAL JOINs)
- Upsert behavior (read receipts, push subscriptions)
- Cascade deletes (user deletion → push subscriptions cleanup)

### E2E Tests — SSE & Real-Time

Test the full event delivery path via HTTP:

```typescript
// Test: sending a message delivers SSE event to other members
test("message send triggers SSE event", async () => {
  const sseStream = await connectSSE(userB.ticket);
  await sendMessage(userA.token, { conversationId: 1, content: "hello" });
  const event = await sseStream.nextEvent("conversation_event");
  expect(event.payload.type).toBe("new_message");
  expect(event.payload.message.content).toBe("hello");
});
```

### What Not to Test

- tRPC router wiring (trust the framework)
- Zod schema validation (test schemas in isolation if complex, otherwise trust Zod)
- Redis pub/sub delivery mechanics (trust ioredis)
- JWT signing/verification (trust jose — test your wrapper if it has custom logic)

## Key Files

| File | What to read it for |
|---|---|
| `index.ts` | Middleware chain, SSE handler, background jobs |
| `trpc/init.ts` | Context creation, enforceUser/rateLimit middleware, procedure types |
| `trpc/router.ts` | Router composition, AppRouter type export |
| `trpc/routers/messages.ts` | Most complex router — send, list, markRead, typing |
| `services/notification-service.ts` | Event-driven notification fan-out pattern |
| `services/realtime-events.ts` | Redis PUBLISH helpers |
| `services/fetch-conversation-summaries.ts` | Heaviest query — conversation list with unread counts |
| `lib/redis.ts` | Publisher singleton + subscriber factory pattern |
| `middleware/trpc-rate-limit.ts` | Per-procedure rate limit configuration |
