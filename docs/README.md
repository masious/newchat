# Docs

> These documents describe every major runtime flow in the app and how data transforms at each step.
> They are meant for Claude (and human developers) to reference when making implementation decisions.

| Doc | What it covers |
|-----|----------------|
| [auth.md](auth.md) | Telegram-based login, JWT issuance, protected procedures, rate limiting middleware |
| [sse-realtime.md](sse-realtime.md) | Ticket-based SSE auth, connection lifecycle, event types, client-side handling, reconnection |
| [conversations.md](conversations.md) | DM vs group creation, deduplication, ConversationSummary shape, list query |
| [messages.md](messages.md) | Sending, optimistic UI, SSE delivery, pagination, read receipts |
| [presence-and-typing.md](presence-and-typing.md) | Presence Redis keys/heartbeat, typing send/receive, display locations |
| [file-uploads.md](file-uploads.md) | Presigned URL flow, R2 storage, allowed types, attachment schema |
| [push-notifications.md](push-notifications.md) | Web Push & Telegram delivery, notification channel enum, subscription flow, service worker |
| [user-profiles.md](user-profiles.md) | users.me/update/search/profile, isPublic flag, avatar upload, presence enrichment |
| [error-handling.md](error-handling.md) | tRPC error codes, ensureConversationMember, client-side error handling, rate limit responses |
| [input-validation.md](input-validation.md) | Zod schemas, message/username/attachment constraints, sanitization functions |
| [reference.md](reference.md) | Redis keys/channels, DB schema, tRPC routers, enums, all configuration constants |
