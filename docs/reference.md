# Reference

Quick-lookup tables for Redis keys, database schema, tRPC routers, and configuration constants.

## Redis Keys (with TTL)

| Pattern                  | Example                      | Value                        | TTL       |
|--------------------------|------------------------------|------------------------------|-----------|
| `presence:{userId}`      | `presence:42`                | `{ status, lastSeen }` JSON | 5 minutes |
| `sse:ticket:{ticket}`    | `sse:ticket:abc...`          | `userId` (string)            | 30 seconds|
| `sse:conn:{userId}`      | `sse:conn:42`                | Connection count (integer)   | 5 minutes |
| `rl:{path}:{identifier}` | `rl:messages.send:user:42`   | Request count (integer)      | varies    |

## Redis Pub/Sub Channels

| Channel Pattern                     | Example                    | Published Events                       |
|-------------------------------------|----------------------------|----------------------------------------|
| `conversation:{conversationId}`     | `conversation:7`           | new_message, typing, message_read      |
| `user:{userId}:membership`          | `user:42:membership`       | join, leave                            |
| `presence:updates`                  | `presence:updates`         | { userId, status, lastSeen }           |

## Database Schema

Source: `packages/db/src/schema.ts`

### Tables

| Table                  | PK                             | Key Columns                                                          |
|------------------------|--------------------------------|----------------------------------------------------------------------|
| `users`                | `id` (auto-increment)          | telegramId (unique), username, firstName, lastName, avatarUrl, isPublic, notificationChannel |
| `auth_tokens`          | `id` (auto-increment)          | token (unique), status (enum), telegramId, userId (FK->users)        |
| `conversations`        | `id` (auto-increment)          | type (enum: dm/group), name                                          |
| `conversation_members` | `(conversation_id, user_id)`   | joinedAt                                                             |
| `messages`             | `id` (auto-increment)          | conversationId (FK), senderId (FK), content, attachments (JSONB)     |
| `read_receipts`        | `(message_id, user_id)`        | readAt                                                               |
| `push_subscriptions`   | `id` (serial)                  | userId (FK, cascade), endpoint, p256dh, auth                         |

### Enums

- `conversation_type`: `"dm"` | `"group"`
- `auth_token_status`: `"pending"` | `"confirmed"` | `"expired"`
- `notification_channel`: `"web"` | `"telegram"` | `"both"` | `"none"`

## tRPC Router Groups

| Router          | Procedures                                              | Auth     |
|-----------------|---------------------------------------------------------|----------|
| `auth`          | createToken, pollToken, exchange                        | public   |
| `users`         | me, update, search, profile, presence, updateNotificationPreferences | protected |
| `conversations` | list, create, members                                   | protected |
| `messages`      | list, send, markRead, typing                            | protected |
| `uploads`       | getPresignedUrl                                         | protected |
| `push`          | (push notification subscriptions)                       | protected |
| `sse`           | createTicket                                            | protected |

## Rate Limits

Per-procedure limits configured in `apps/server/src/middleware/trpc-rate-limit.ts`. Default: 60 requests per 60 seconds.

| Procedure                | Limit   | Window | Keyed By |
|--------------------------|---------|--------|----------|
| `auth.createToken`       | 5/min   | 60s    | IP       |
| `auth.pollToken`         | 30/min  | 60s    | IP       |
| `auth.exchange`          | 10/min  | 60s    | IP       |
| `messages.send`          | 60/min  | 60s    | userId   |
| `messages.typing`        | 20/min  | 60s    | userId   |
| `users.search`           | 20/min  | 60s    | userId   |
| `uploads.getPresignedUrl`| 20/min  | 60s    | userId   |
| `conversations.create`   | 10/min  | 60s    | userId   |
| `sse.createTicket`       | 10/min  | 60s    | userId   |

## Configuration Constants

| Constant                 | Value        | Location                          |
|--------------------------|--------------|-----------------------------------|
| JWT expiry               | 7 days       | `server/src/lib/jwt.ts`           |
| Auth token TTL           | 5 minutes    | `server/src/trpc/routers/auth.ts` |
| SSE ticket TTL           | 30 seconds   | `server/src/trpc/routers/sse.ts`  |
| SSE max connections/user | 5            | `server/src/index.ts`             |
| SSE max lifetime         | 24 hours     | `server/src/index.ts`             |
| SSE keepalive interval   | 30 seconds   | `server/src/index.ts`             |
| Presence TTL             | 5 minutes    | `server/src/lib/presence.ts`      |
| Presence heartbeat       | 60 seconds   | `server/src/index.ts`             |
| Typing throttle (send)   | 2 seconds    | `web useTypingIndicator hook`     |
| Typing timeout (display) | 3 seconds    | `web use-sse.ts`                  |
| Read receipt debounce    | 300ms        | `web useMarkReadOnVisible`        |
| Message page size        | 25           | `server messages.list`            |
| Max attachments/message  | 10           | `server messages.send`            |
| Max file size            | 10 MB        | `server uploads router`           |
| Max message length       | 10,000 chars | `server messages.send`            |
