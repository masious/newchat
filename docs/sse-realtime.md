# SSE Connection & Real-Time Events

SSE is the single real-time transport. All live updates (messages, typing, presence, membership) flow through it.

## Ticket-Based Auth

SSE connections do NOT use the JWT directly in the URL. Instead, the client first obtains a short-lived ticket:

```
Web ──trpc──> sse.createTicket (protectedProcedure)
              ──> Redis SET sse:ticket:{nanoid(32)} = userId, EX 30
              <── { ticket }

Web opens:    new EventSource("http://localhost:4000/events?ticket={ticket}")

Server /events handler:
  1. Redis GETDEL sse:ticket:{ticket} -> userId  (one-time use)
  2. If missing -> 401
  3. Redis INCR sse:conn:{userId} (concurrency check, max 5)
  4. If over limit -> 429
  5. Open SSE stream
```

- Ticket TTL: 30 seconds
- Max concurrent connections per user: 5
- Defined in `apps/server/src/trpc/routers/sse.ts` and `apps/server/src/index.ts:100-256`

## Connection Lifecycle

```
SSE stream opened:
  1. markOnline(userId) -> Redis SET presence:{userId}, publish to presence:updates
  2. Query conversation_members -> get all conversationIds for user
  3. Redis SUBSCRIBE to:
     - conversation:{id} for each conversation
     - user:{userId}:membership
     - presence:updates
  4. Send init event: { userId, channels: [conversationId, ...] }
  5. Start keepalive ping every 30 seconds
  6. Start presence heartbeat every 60 seconds

SSE stream closed (onAbort):
  1. clearInterval(keepalive)
  2. clearInterval(presenceHeartbeat)
  3. subscriber.disconnect()
  4. decrementConcurrency(sse:conn:{userId})
  5. markOffline(userId) -> Redis SET + publish
```

- Max lifetime: 24 hours (`SSE_MAX_LIFETIME_MS`)
- Keepalive ping: every 30 seconds (prevents proxy timeouts)

## SSE Event Types

| SSE Event Name       | Redis Channel Source               | Payload Shape                                                        |
|----------------------|------------------------------------|----------------------------------------------------------------------|
| `init`               | (sent on connect)                  | `{ userId, channels: number[] }`                                     |
| `ping`               | (keepalive timer)                  | `""` (empty)                                                         |
| `conversation_event` | `conversation:{id}`                | `{ channel, payload: { type, ...details } }`                         |
| `membership`         | `user:{userId}:membership`         | `{ type: "join"\|"leave", conversationId, conversation? }`           |
| `presence`           | `presence:updates`                 | `{ userId, status: "online"\|"offline", lastSeen }`                  |

## Conversation Event Sub-Types

Events arriving via `conversation_event` are wrapped: `{ channel, payload }`. The `payload.type` distinguishes:

| `payload.type`  | Trigger                | Payload Fields                                             |
|-----------------|------------------------|------------------------------------------------------------|
| `new_message`   | `messages.send`        | `{ type, conversationId, message: MessageWithSender }`     |
| `typing`        | `messages.typing`      | `{ type, conversationId, userId }`                         |
| `message_read`  | `messages.markRead`    | `{ type, conversationId, messageIds: number[], userId }`   |

## Client-Side Event Handling

All handling is in `apps/web/src/lib/hooks/use-sse.ts`. The `useSSE()` hook runs inside `RealtimeProvider` (`apps/web/src/lib/providers/realtime-provider.tsx`).

**Reconnection logic:**
- On error: close current EventSource, retry after 2 seconds
- On ticket creation failure: retry after 5 seconds
- On reconnect: invalidate `conversations.list` and `messages.list` queries

**Dynamic channel subscription:**
When a `membership` event with `type: "join"` arrives, the server automatically subscribes the SSE connection to the new `conversation:{id}` channel. On `"leave"`, it unsubscribes.
