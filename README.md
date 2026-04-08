# Kite

A real-time chat application with Telegram-based authentication. Built as a Bun monorepo with a Next.js frontend, Hono API server, and a Telegram bot for login.

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS v4
- **Backend:** Hono + tRPC v11 on Bun
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Real-time:** Server-Sent Events + Redis pub/sub
- **Auth:** Telegram bot deep-link flow + JWT
- **File Storage:** Cloudflare R2
- **Monorepo:** Turborepo + Bun workspaces

## Prerequisites

- [Bun](https://bun.sh) v1.2.5+
- [Docker](https://www.docker.com/) (for Redis)
- A [Neon](https://neon.tech) PostgreSQL database
- A [Telegram Bot](https://core.telegram.org/bots#creating-a-new-bot) token
- [Cloudflare R2](https://developers.cloudflare.com/r2/) credentials (for file uploads)

## Setup

1. **Install dependencies**

   ```bash
   bun install
   ```

2. **Configure environment variables**

   ```bash
   cp apps/server/.env.example apps/server/.env
   ```

   Fill in the required values: `DATABASE_URL`, `REDIS_URL`, `TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, and `R2_*` credentials. For push notifications, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `WEB_APP_URL`. The web app needs `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

3. **Start Redis**

   ```bash
   docker compose up -d
   ```

4. **Set up the database**

   ```bash
   bun db:push
   ```

5. **Start development servers**

   ```bash
   bun dev
   ```

   This starts the web app on [localhost:3001](http://localhost:3001) and the API server on [localhost:4000](http://localhost:4000).

## Scripts

| Command | Description |
|---|---|
| `bun dev` | Start all apps in dev mode |
| `bun build` | Build all apps |
| `bun lint` | Lint all apps |
| `bun db:generate` | Generate migrations from schema changes |
| `bun db:migrate` | Run pending migrations |
| `bun db:push` | Push schema directly (no migration files) |
| `bun db:nuke` | Drop all tables and re-push schema (requires `--confirm`) |

## Project Structure

```
apps/
  web/            → Next.js frontend (port 3001)
  server/         → Hono + tRPC API server (port 4000)
  telegram-bot/   → Grammy bot for Telegram auth
packages/
  db/             → Drizzle ORM schema & Neon client
  typescript-config/ → Shared tsconfig bases
docs/               → Architecture & design documentation
```

## Technical Decisions

### Real-Time: SSE over WebSockets

The app uses **Server-Sent Events** for all real-time communication (messages, typing indicators, presence updates, membership changes) rather than WebSockets. SSE is unidirectional (server → client), which fits the use case — the client already sends data through tRPC mutations, so a bidirectional channel isn't needed. SSE also works natively with HTTP/2 multiplexing, survives proxy and load-balancer configurations that often break WebSocket upgrades, and reconnects automatically via the browser's `EventSource` API.

Each SSE connection is authenticated with a **short-lived ticket** (30-second TTL) obtained through a tRPC call, rather than passing the JWT in the URL query string where it would be logged by proxies and appear in browser history. The ticket is single-use — consumed via Redis `GETDEL` on connection.

Connection safeguards prevent resource leaks: max 5 concurrent SSE connections per user, a 24-hour maximum lifetime per connection (forces periodic reconnect), and 30-second keepalive pings to prevent proxy timeouts. Connection counts are tracked in Redis with a 5-minute TTL that auto-heals if a server crashes without cleanup.

### End-to-End Type Safety with tRPC

The API layer uses **tRPC v11**, which shares the `AppRouter` type directly from the server package to the web client at build time — no code generation, no OpenAPI spec, no runtime overhead. The server defines procedures with Zod input schemas, and the client gets full autocompletion and type checking on every query, mutation, and their inputs/outputs. Combined with Drizzle ORM (which infers TypeScript types from the database schema), types flow from the database table definitions all the way to the React components with no manual type duplication.

### Redis Pub/Sub for Event Fan-Out

Real-time event delivery is built on **Redis pub/sub** with per-user subscriptions. When an SSE connection opens, a dedicated Redis subscriber is created for that connection and subscribes to the user's conversation channels (`conversation:{id}`), their membership channel (`user:{userId}:membership`), and the global presence channel (`presence:updates`). When a user joins or leaves a conversation, the subscriber dynamically subscribes/unsubscribes from the corresponding channel.

This model means each user connection only receives events relevant to them. In a multi-instance deployment, Redis handles the fan-out — when any server instance publishes a message event, all subscriber connections for that conversation (regardless of which server instance they're on) receive it. The server itself is stateless; all coordination happens through Redis.

### Telegram-Based Authentication

There are no passwords or OAuth providers. Authentication uses a **Telegram deep-link flow**: the web app creates a one-time token, the user opens a Telegram link that sends the token to the bot, the bot confirms it in the database, and the web app exchanges the confirmed token for a JWT (7-day expiry, HS256). This eliminates password storage, password reset flows, and email verification — the user's Telegram account is the identity. A background job expires unclaimed tokens after 5 minutes.

### Rate Limiting

Every tRPC procedure is rate-limited using a **fixed-window counter** backed by Redis `INCR` + `EXPIRE`. Public endpoints (auth) are keyed by client IP, while protected endpoints are keyed by authenticated user ID. Limits are configured per-procedure — for example, `messages.send` allows 60 requests/min, `auth.createToken` allows 5/min, and `users.search` allows 20/min. Rate limit responses include `Retry-After` and `X-RateLimit-*` headers. The `/health` endpoint has its own separate rate limit outside the tRPC pipeline.

### Push Notifications

Message notifications are delivered through **two channels**: Web Push (via the `web-push` library with VAPID keys) and Telegram bot messages. Each user selects their preference (`web`, `telegram`, `both`, or `none`). Notification delivery is fire-and-forget — it runs via `Promise.allSettled()` after the message is persisted and never blocks the API response. Expired Web Push subscriptions (410/404 from the push service) are automatically cleaned up from the database.
