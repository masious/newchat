# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
bun install

# Start all apps in dev mode (web on :3001, server on :4000)
bun dev

# Build all apps
bun run build

# Lint all apps
bun lint

# Database commands (Drizzle Kit via Turbo)
bun db:generate    # Generate migrations from schema changes
bun db:migrate     # Run migrations
bun db:push        # Push schema directly (no migration files)

# Run a single app
cd apps/web && bun dev
cd apps/server && bun dev
cd apps/telegram-bot && bun dev

# Infrastructure
docker compose up -d   # Start Redis on :6379
```

## Architecture

Bun monorepo managed by Turborepo with three apps and two shared packages.

### Apps

- **`apps/server`** — Hono + tRPC v11 API server running on Bun (port 4000). Exports its tRPC AppRouter type for the web client. Real-time events via SSE endpoint at `/events?token={jwt}`, backed by Redis pub/sub. File uploads use Cloudflare R2 presigned URLs.
- **`apps/web`** — Next.js 15 (App Router, Turbopack) + React 19 + Tailwind CSS v4 (port 3001). Uses `@trpc/react-query` for API calls. Auth state managed via custom `AuthProvider` context with JWT in localStorage (`newchat.jwt`). Real-time updates via SSE in `RealtimeProvider`.
- **`apps/telegram-bot`** — Grammy bot that handles Telegram-based authentication. Users start the bot with a deep link token, bot confirms the token in DB, web app polls and exchanges for JWT.

### Packages

- **`packages/db`** — Drizzle ORM schema + Neon PostgreSQL client. Exports `@newchat/db` (db client) and `@newchat/db/schema` (tables/types). Tables: users, authTokens, conversations, conversationMembers, messages, readReceipts.
- **`packages/typescript-config`** — Shared tsconfig bases (base, node, nextjs).

### Key Patterns

- **tRPC end-to-end types**: Server exports `AppRouter` type via `@newchat/server/trpc`, web imports it for type-safe client. Router groups: auth, users, conversations, messages, uploads.
- **Auth flow**: Web creates auth token → user clicks Telegram deep link → bot confirms token with userId → web polls token status → exchanges for JWT (7-day expiry). Protected procedures validate JWT from `Authorization: Bearer` header.
- **Real-time**: Server publishes to Redis channels (`conversation:{id}`, `user:{id}:membership`, `presence:updates`). SSE endpoint subscribes per connection. Web's `RealtimeProvider` handles SSE and updates React Query cache optimistically.
- **Presence**: Redis keys with 5-minute TTL, heartbeat every 60s from SSE connections.
- **File uploads**: Client gets presigned URL from server → PUTs directly to R2 → stores public URL in message attachments (JSONB column).
- **Path alias**: All apps use `@/*` → `src/*`.

### Detailed Flows

See **[docs/](docs/README.md)** for comprehensive documentation of every runtime flow. Consult before making implementation decisions:
- [auth.md](docs/auth.md) — Telegram login, JWT, protected procedures, rate limiting
- [sse-realtime.md](docs/sse-realtime.md) — SSE connection, event types, client handling
- [conversations.md](docs/conversations.md) — DM vs group, creation, ConversationSummary shape
- [messages.md](docs/messages.md) — Send, optimistic UI, delivery, read receipts
- [presence-and-typing.md](docs/presence-and-typing.md) — Presence lifecycle, typing indicators
- [file-uploads.md](docs/file-uploads.md) — Presigned URLs, R2, attachment schema
- [push-notifications.md](docs/push-notifications.md) — Web Push & Telegram delivery, notification channel, subscription flow
- [user-profiles.md](docs/user-profiles.md) — users.me/update/search/profile, isPublic flag, avatar upload, presence
- [error-handling.md](docs/error-handling.md) — tRPC error codes, ensureConversationMember, client error handling
- [input-validation.md](docs/input-validation.md) — Zod schemas, message/username/attachment constraints, sanitization
- [reference.md](docs/reference.md) — Redis keys, DB schema, tRPC routers, constants

## Environment

Copy `apps/server/.env.example` to `apps/server/.env`. Required: `DATABASE_URL` (Neon), `REDIS_URL`, `TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, `R2_*` credentials. The web app needs `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` set.


## Workflow Rules
Before starting edits, present your plan and wait for explicit user approval. Do not begin modifying files until the approach is confirmed. When the user asks for a specific change, do exactly that change — do not make additional 'improvement' edits beyond scope.

## Keeping Docs in Sync
After implementing a new feature, changing an architectural pattern, modifying data shapes, adding/removing tRPC procedures, changing Redis keys/channels, or updating configuration constants, update the relevant file(s) in `docs/` to reflect the change. Docs must stay in sync with the actual implementation — treat them as part of the deliverable, not an afterthought.