# NewChat

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

   Fill in the required values: `DATABASE_URL`, `REDIS_URL`, `TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, and `R2_*` credentials. The web app also needs `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.

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

## Project Structure

```
apps/
  web/            → Next.js frontend (port 3001)
  server/         → Hono + tRPC API server (port 4000)
  telegram-bot/   → Grammy bot for Telegram auth
packages/
  db/             → Drizzle ORM schema & Neon client
  typescript-config/ → Shared tsconfig bases
```
