# Docs

> These documents describe every major runtime flow in the app and how data transforms at each step.
> They are meant for Claude (and human developers) to reference when making implementation decisions.

## Architecture

| Doc | What it covers |
|-----|----------------|
| [system-overview.md](system-overview.md) | Architecture diagram, service dependencies, end-to-end request lifecycles (message send, login, SSE connection) |
| [backend-architecture.md](backend-architecture.md) | Layered architecture, event-driven patterns, error handling strategy, connection management, scaling, testing |
| [frontend-architecture.md](frontend-architecture.md) | Provider tree, state management, component organization, real-time cache updates, optimistic updates, routing |
| [design-system.md](design-system.md) | Color palette, dark mode pairing, typography, spacing, border radius, shadows, component patterns, anti-patterns |

## Runtime Flows

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
