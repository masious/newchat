# System Overview

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                    │
│                                                                         │
│  ┌──────────────────────┐           ┌────────────────────────────────┐  │
│  │   Next.js Web App    │           │        Telegram App            │  │
│  │   (port 3001)        │           │                                │  │
│  │                      │           │  User clicks deep link:        │  │
│  │  tRPC ──────────┐    │           │  t.me/bot?start={token}        │  │
│  │  (HTTP)         │    │           └──────────────┬─────────────────┘  │
│  │                 │    │                          │                     │
│  │  SSE  ────────┐ │    │                          │                     │
│  │  (EventSource)│ │    │                          │                     │
│  └───────────────┼─┼────┘                          │                     │
└──────────────────┼─┼───────────────────────────────┼─────────────────────┘
                   │ │                               │
                   │ │  HTTP                         │  Telegram Bot API
                   │ │                               │
┌──────────────────┼─┼───────────────────────────────┼─────────────────────┐
│                  │ │        SERVER LAYER            │                     │
│                  │ │                               │                     │
│  ┌───────────────▼─▼──────────┐   ┌───────────────▼──────────────────┐  │
│  │   Hono API Server          │   │   Telegram Bot (Grammy)          │  │
│  │   (port 4000)              │   │                                  │  │
│  │                            │   │   /start handler:                │  │
│  │   /trpc/*  → tRPC router   │   │     upsert user                 │  │
│  │   /events  → SSE stream    │   │     confirm auth token           │  │
│  │   /health  → health check  │   │                                  │  │
│  └─────────┬──────┬───────────┘   └──────────────┬───────────────────┘  │
│            │      │                              │                       │
└────────────┼──────┼──────────────────────────────┼───────────────────────┘
             │      │                              │
             │      │                              │
┌────────────┼──────┼──────────────────────────────┼───────────────────────┐
│            │      │       DATA LAYER             │                       │
│            │      │                              │                       │
│  ┌─────────▼──────┼──────────┐   ┌──────────────▼───────────────────┐   │
│  │  Redis          │         │   │   Neon PostgreSQL                │   │
│  │                 │         │   │                                  │   │
│  │  pub/sub ◄──────┘         │   │   users, conversations,         │   │
│  │  (SSE fan-out)            │   │   messages, read_receipts,      │   │
│  │                           │   │   auth_tokens,                  │   │
│  │  keys:                    │   │   push_subscriptions            │   │
│  │  - presence:{userId}      │   │                                  │   │
│  │  - sse:ticket:{ticket}    │   │   (Drizzle ORM)                 │   │
│  │  - sse:conn:{userId}      │   │                                  │   │
│  │  - rl:{path}:{identifier} │   └──────────────────────────────────┘   │
│  └───────────────────────────┘                                          │
│                                                                         │
│  ┌───────────────────────────┐                                          │
│  │  Cloudflare R2            │                                          │
│  │                           │                                          │
│  │  File uploads via         │                                          │
│  │  presigned URLs           │                                          │
│  │  (client PUTs directly)   │                                          │
│  └───────────────────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Connection summary

| From | To | Protocol | Purpose |
|---|---|---|---|
| Web App | Hono Server | HTTP (tRPC batch) | All API calls (queries + mutations) |
| Web App | Hono Server | SSE (EventSource) | Real-time events (messages, typing, presence) |
| Web App | Cloudflare R2 | HTTP PUT | Direct file uploads via presigned URL |
| Telegram Bot | Neon PostgreSQL | TCP (Drizzle) | User upsert, token confirmation |
| Hono Server | Neon PostgreSQL | TCP (Drizzle) | All reads/writes |
| Hono Server | Redis | TCP | Pub/sub, presence, rate limits, SSE tickets |
| Hono Server | Telegram Bot API | HTTPS | Push notifications to Telegram |

### External service dependencies

| Service | What breaks if it's down |
|---|---|
| Neon PostgreSQL | Everything — all reads/writes fail |
| Redis | SSE connections fail, rate limiting fails, presence goes stale |
| Cloudflare R2 | File uploads fail; existing files still accessible via public URLs |
| Telegram Bot API | Login flow fails (users can't confirm tokens), Telegram notifications fail |

---

## Request Lifecycles

### Sending a message (end-to-end)

This traces a single `messages.send` call through every layer.

```
 Web App                          Hono Server                   Redis                    Neon DB
 ───────                          ───────────                   ─────                    ───────

 1. User types message
    and hits send
         │
 2. Optimistic insert
    into React Query cache
    (negative temp ID)
         │
 3. trpc.messages.send ─────────► 4. Hono middleware chain
                                     (security headers, CORS,
                                      pino request logging)
                                  5. tRPC handler
                                     │
                                  6. createTRPCContext
                                     extract JWT from header
                                     │
                                  8. enforceUser middleware
                                     verify JWT → userId
                                     │
                                  9. rateLimit middleware ────► 10. INCR rl:messages.send:user:{id}
                                     check: 60/min              ◄── count
                                     │
                                  11. messages.send handler
                                      │
                                  12. ensureConversationMember ──────────────────────► 13. SELECT from
                                      (authorization check)      ◄──────────────────── conversation_members
                                      │
                                  14. INSERT message ────────────────────────────────► 15. INSERT into messages
                                      │                          ◄──────────────────── { id, content, ... }
                                  16. INSERT read receipt ───────────────────────────► 17. INSERT into read_receipts
                                      (sender auto-reads)        ◄──────────────────── (sender, messageId)
                                      │
                                  18. fetchMessageWithSender ────────────────────────► 19. SELECT message
                                      │                          ◄──────────────────── JOIN users
                                      │
                                  20. Redis PUBLISH ─────────► 21. conversation:{id}
                                      (SSE fan-out)               channel receives event
                                      │                           │
                                  22. Return { message } ◄──┐    │
                                                            │    │
 23. tRPC response ◄───────────────────────────────────────┘    │
     (mutation success)                                          │
                                                                 │
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ (SSE path, parallel)
                                                                 │
                                  24. SSE handler receives ◄─────┘
                                      pub/sub message
                                      │
                                  25. Sends SSE event to
                                      all subscribed clients
                                      │
 26. SSE event arrives ◄──────────────┘
     (conversation_event,
      type: "new_message")
     │
 27. Match optimistic message
     by conversationId + content
     │
 28. Replace temp ID with
     real server ID in cache
     │
 29. Update conversations.list:
     - set lastMessage
     - bump unreadCount
     - re-sort by activity
     │
 30. Dispatch "newchat:new-message"
     CustomEvent (notification sound)

 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (push notification path, fire-and-forget)

                                  31. For each conversation member
                                      (excluding sender):
                                      notifyUserOfMessage()
                                      │
                                  32. Check user's notificationChannel ──► 33. SELECT from users
                                      │                                    ◄──
                                  34. If "web"/"both":
                                      sendWebPushNotifications() ───────► 35. SELECT push_subscriptions
                                      │                                    ◄──
                                  36. POST to push service endpoint
                                      │
                                  37. If "telegram"/"both":
                                      POST to Telegram Bot API
                                      /sendMessage
```

### Logging in (end-to-end)

```
 Web App                    Hono Server              Telegram Bot           Neon DB
 ───────                    ───────────              ────────────           ───────

 1. Open /auth page
    │
 2. auth.createToken ──────► 3. Generate nanoid(32) ─────────────────────► 4. INSERT authTokens
    │                         ◄──────────────────────────────────────────── { token, status:"pending" }
 5. Receive { token }  ◄────┘
    │
 6. Display Telegram
    deep link button:
    t.me/bot?start={token}
    │
 7. Start polling ─────────► 8. auth.pollToken
    (every 2 seconds)          SELECT status ─────────────────────────────► 9. FROM authTokens
                               ◄──────────────────────────────────────────── { status:"pending" }
 10. status="pending"  ◄────┘
     keep polling...

 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (user opens Telegram)

 11. User clicks deep link
     in Telegram
                                                      12. /start {token}
                                                          │
                                                      13. Validate token format
                                                          │
                                                      14. Upsert user ──────────────────────► 15. INSERT/UPDATE users
                                                          │                ◄──────────────── { telegramId, name, ... }
                                                      16. Confirm token ────────────────────► 17. UPDATE authTokens
                                                          │                ◄──────────────── SET status="confirmed"
                                                      18. Reply "You're signed in!"

 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (back on web app)

 19. Poll returns ◄────────── 20. auth.pollToken
     status="confirmed"           SELECT status ──────────────────────────► FROM authTokens
                                  ◄──────────────────────────────────────── { status:"confirmed" }
 21. auth.exchange ────────► 22. Atomically mark token
     { token }                    as "expired" ────────────────────────────► UPDATE authTokens
                                  │                ◄──────────────────────── SET status="expired"
                              23. Sign JWT
                                  { sub: userId, exp: 7d }
                                  │
 24. Receive { jwt }  ◄────────┘
     │
 25. Store in localStorage
     ("newchat.jwt")
     │
 26. AuthProvider detects token
     → status = "authenticated"
     │
 27. Redirect to /chat
     (or /onboarding if first login)
```

### Establishing SSE connection

```
 Web App                          Hono Server                   Redis
 ───────                          ───────────                   ─────

 1. RealtimeProvider mounts
    (user is authenticated)
    │
 2. sse.createTicket ────────────► 3. Generate nanoid(32)
    (protectedProcedure)              │
                                  4. SET sse:ticket:{ticket} ──► 5. userId, EX 30s
                                      │
 6. Receive { ticket }  ◄───────────┘
    │
 7. new EventSource(
    "/events?ticket={ticket}")
    │
 ──────────────────────────────► 8. GETDEL sse:ticket:{ticket} ► 9. Returns userId
                                     (one-time use)                  (key deleted)
                                     │
                                 10. INCR sse:conn:{userId} ───► 11. Connection count
                                     check ≤ 5                       (TTL 5 min)
                                     │
                                 12. markOnline(userId) ───────► 13. SET presence:{userId}
                                     │                               PUBLISH presence:updates
                                     │
                                 14. Query user's conversations ──────────► Neon DB
                                     │                           ◄────────
                                     │
                                 15. SUBSCRIBE to: ────────────► conversation:{id} (each)
                                     │                           user:{userId}:membership
                                     │                           presence:updates
                                     │
 16. SSE event: "init" ◄────────── 17. Send { userId, channels }
     │
 18. Connection established
     │
     │  ┌─────── every 30s ──────── 19. SSE event: "ping" (keepalive)
     │  │
     │  │ ┌───── every 60s ──────── 20. Refresh presence TTL in Redis
     │  │ │
     ▼  ▼ ▼
    [listening for events...]
```

### Horizontal scaling note

Multiple Hono server instances can run simultaneously. Redis pub/sub is the coordination layer — when Server A publishes a message event, Server B's SSE connections receive it through their Redis subscriptions. Each instance maintains its own SSE connections but shares state through Redis (presence, tickets, rate limits) and Neon (all persistent data).
