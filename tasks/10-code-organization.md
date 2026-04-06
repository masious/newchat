# Code Organization

**Priority:** Low
**Status:** Done

---

## Server App

### 1. Extract SSE Handler from `index.ts`

`apps/server/src/index.ts` is 284 lines and mixes app setup, CORS, health checks, a token-expiration job, and **164 lines of inline SSE endpoint implementation** (lines 110–274) including subscription management, event dispatching, presence heartbeats, and cleanup.

Per [backend-architecture.md](docs/backend-architecture.md), the SSE connection is a four-state lifecycle (AUTHENTICATING → SUBSCRIBING → ACTIVE → CLOSED) with well-defined responsibilities at each stage. This state machine deserves its own module rather than living inside the entrypoint.

**Fix:** Extract the SSE handler into its own module (e.g., `services/sse-handler.ts`). The handler already follows the documented state machine — extracting it just gives it a proper home and makes `index.ts` a thin wiring file (middleware chain + route mounting + background jobs).

### 2. Centralize Shared Constants

`TOKEN_TTL_MS = 5 * 60 * 1000` is defined in two places:
- `apps/server/src/index.ts:31`
- `apps/server/src/services/auth-service.ts:12`

[reference.md](docs/reference.md) documents all configuration constants with their values and source locations, but the source files don't import from a shared location. Other candidates:

- Auth token regex `/^[a-zA-Z0-9_-]{32}$/` (duplicated on lines 15 and 24 of `trpc/routers/auth.ts`)
- Pagination limits — messages max 50/default 25, user search max 25/default 10 (magic numbers inline in routers)
- SSE constants — `MAX_SSE_CONNECTIONS = 5`, `SSE_MAX_LIFETIME = 24h`, `SSE_KEEPALIVE = 30s`, `PRESENCE_HEARTBEAT = 60s` (all inline in `index.ts`)
- JWT expiry `"7d"` (single location in `lib/jwt.ts`, but still a magic string)

`MAX_FILE_SIZE` and `ALLOWED_CONTENT_TYPES` are already centralized in `lib/upload-constants.ts` — no action needed for those.

**Fix:** Create `apps/server/src/lib/constants.ts` and import from there. This also makes `reference.md` easier to keep in sync — one source location per constant.

### 3. Uploads Router Has Inline Business Logic

Per [backend-architecture.md](docs/backend-architecture.md), the layered architecture is **Routers → Services → Data Access** with routers reading "like a table of contents (~20 lines max)." Every other router follows this — `messages.ts` delegates to `message-service.ts`, `auth.ts` to `auth-service.ts`, etc.

`trpc/routers/uploads.ts` (lines 18–38) breaks this by doing content-type validation, file-size checks, filename sanitization, and S3 key generation directly in the router.

**Fix:** Create `services/upload-service.ts` and move the logic there. The router should just validate input, call the service, and return the result.

### 4. Internal Error Message Leakage

Per [error-handling.md](docs/error-handling.md), the error strategy is: domain errors thrown by services → caught by routers → mapped to tRPC codes. Infrastructure errors propagate as unhandled exceptions → tRPC returns generic `INTERNAL_SERVER_ERROR`.

However, raw `Error` throws in the data access layer include internal details that leak through:
- `lib/jwt.ts:9` — `throw new Error("JWT_SECRET is not set")`
- `lib/r2.ts:6` — `throw new Error(\`${name} is not set\`)` (exposes `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, etc.)

These are not `DomainError` subclasses, so `mapDomainError` in `trpc/error-mapper.ts` doesn't catch them. They surface as 500s with the message visible to clients.

**Fix:** These are startup/config errors — they should either fail fast at boot (validate env on import, crash before serving), or be wrapped in a Hono `onError` handler that strips internal details and logs via Pino. Don't convert them to `DomainError` — they're not domain errors, they're infrastructure failures.

### 5. Duplicate IP Extraction Logic

Identical `x-forwarded-for` / `x-real-ip` parsing exists in:
- `middleware/rate-limit.ts` (lines 15–18)
- `index.ts` tRPC context creation (lines 29–31)

Both are in the data access / lib layer per the architecture, so a shared utility is the right home.

**Fix:** Extract to `lib/client-ip.ts` and import in both places.

### 6. Duplicate R2 URL Validation

Both `trpc/routers/messages.ts` and `trpc/routers/users.ts` have `.refine(url => url.startsWith(R2_PUBLIC_URL))` for validating attachment/avatar URLs. Per [input-validation.md](docs/input-validation.md), Zod schemas handle input validation at the router layer — shared validation logic should be reusable.

**Fix:** Create a shared Zod schema (e.g., `r2UrlSchema`) in `lib/upload-constants.ts` alongside the existing `MAX_FILE_SIZE` and `ALLOWED_CONTENT_TYPES`.

### 7. Inconsistent Data Layer Patterns

Per [backend-architecture.md](docs/backend-architecture.md), the data access layer lives in `data/` (queries) and `lib/` (Redis ops, external APIs).

- `data/conversation-queries.ts` uses raw SQL with `.execute<ConversationRow>()`
- `data/message-queries.ts` and `data/user-queries.ts` use the Drizzle query builder

The raw SQL may be intentional (the conversation summary query involves lateral joins and complex aggregation), but this should be explicitly noted.

**Fix:** Either migrate to Drizzle query builder for consistency, or add a comment explaining why raw SQL is necessary (e.g., lateral join performance). If raw SQL stays, consider typing the result with Drizzle's `$inferSelect` rather than a manual `ConversationRow` interface.

### 8. Scattered Server Type Definitions

Domain types are spread across multiple locations with no centralized directory:
- `trpc/types.ts` — `MessageSender`, `MessageWithSender`, `ConversationSummary`, `Member`
- `lib/presence.ts` — `PresenceStatus`
- `lib/web-push.ts` — `PushSubscription`, `PushPayload`
- `lib/rate-limit.ts` — `RateLimitResult`
- `services/notification-service.ts` — `NotificationPayload`
- `data/conversation-queries.ts` — `ConversationRow` (unexported)

Per the architecture, domain types like `ConversationSummary` and `MessageWithSender` are shared across layers (routers import them, services produce them, data access returns raw rows that map to them). Having them in `trpc/types.ts` couples them to the transport layer.

**Fix:** Move shared domain types to a `types/` directory (e.g., `types/domain.ts`, `types/events.ts`). Keep transport-specific types (tRPC context, middleware) in `trpc/`. Keep co-located types (like `RateLimitResult`) where they are if only used by one module.

### 9. Loose Error Typing

Several services use `catch (err: any)` and `Promise<any>[]`:
- `services/user-service.ts` line 37
- `services/notification-service.ts` line 32

**Fix:** Use `unknown` for catch clauses and narrow with type guards. Replace `Promise<any>[]` with specific return types.

---

## Web App

### 10. Split `profile-dialog.tsx` (600 lines)

`components/users/profile-dialog.tsx` contains two complete dialog components:
- `ProfileDialog` (~158 lines) — view-only profile display
- `EditProfileDialog` (~442 lines) — form with profile, settings, and notification preferences

Per [frontend-architecture.md](docs/frontend-architecture.md), the component pattern is feature folders with `index.tsx` (orchestrator) + `components/` (presentational) + `hooks/` + `types.ts`. This file has two unrelated dialogs sharing a file, and `EditProfileDialog` mixes three separate fieldsets (profile, settings, notifications) with hardcoded radio options.

**Fix:** Restructure into a `components/users/` feature folder:
```
users/
├── profile-dialog.tsx        (view-only)
├── edit-profile-dialog/
│   ├── index.tsx             (form orchestrator)
│   ├── components/
│   │   ├── profile-fields.tsx
│   │   ├── settings-fields.tsx
│   │   └── notification-fields.tsx
│   └── types.ts
```

### 11. Refactor `use-sse.ts` (326 lines)

Per [frontend-architecture.md](docs/frontend-architecture.md), the SSE hook is "the bridge" between server events and React Query cache. It handles three event types (conversation, membership, presence), each with multiple sub-events documented in [sse-realtime.md](docs/sse-realtime.md):

| Event Type | Cache Update |
|-----------|--------------|
| `new_message` | Match optimistic → swap temp ID → update list → clear typing |
| `typing` | Set isTyping + typingUserId, 3s auto-clear |
| `message_read` | Set readByOthers, set unreadCount: 0 |
| `join` | Upsert conversation, re-sort |
| `leave` | Remove conversation |
| `presence` | Invalidate users.profile / users.presence |

The 163-line `handleConversationEvent` function does all cache mutations inline. The hook mixes two concerns: connection lifecycle (connect, retry, backoff) and cache synchronization (event → query cache update).

**Fix:** Extract cache update logic into `lib/sse-cache-updaters.ts` as pure functions that receive query utils and event data. The hook keeps connection lifecycle (documented backoff: 2s base, 1.5x multiplier, 30s cap, max 10 retries). This also makes cache update logic testable independently.

### 12. Simplify `user-search-combobox.tsx` (281 lines)

`components/chat/user-search-combobox.tsx` manages search debouncing, two completely separate JSX trees for single-select and multi-select modes, and complex state driven by a props type union.

Per [frontend-architecture.md](docs/frontend-architecture.md), the pattern for complex components is: extract logic into hooks when it's more than "set state on click."

**Fix:** Extract search/debounce logic into a custom hook (the `useUserSearch` hook already exists in `lib/hooks/` — reuse or extend it). Split the single-select and multi-select modes into two components sharing the hook, or use composition to avoid duplicate JSX trees.

### 13. Missing Barrel Files

Per [frontend-architecture.md](docs/frontend-architecture.md), feature folders use `index.tsx` as the public entry point. Several directories lack barrel exports:
- `components/chat/`
- `components/ui/`
- `components/users/`
- `lib/hooks/`
- `lib/providers/`

This leads to verbose multi-line imports across the app.

**Fix:** Add `index.ts` barrel files for feature directories. Keep barrels shallow (one level of re-exports) to avoid circular dependency issues and preserve tree-shaking.

### 14. Scattered Web Type Definitions

Inline types in multiple component files:
- `profile-dialog.tsx` — `DisplayUser`
- `user-search-combobox.tsx` — props type union (lines 14–26)
- `new-chat-dialog.tsx` — `PollStatus`
- `auth/page.tsx` — token/status types

Central types exist in `lib/trpc-types.ts` (good — these are the inferred server types), but `conversation-sidebar/types.ts` is a redundant 3-line re-export barrel.

Per [frontend-architecture.md](docs/frontend-architecture.md), the feature folder pattern includes a `types.ts` for co-located types. Small component-specific types are fine inline. The issue is types that are shared across features but not centralized.

**Fix:** Keep component-specific types co-located. Extract shared types (used by multiple features) to `lib/types/`. Remove the redundant `conversation-sidebar/types.ts` re-export.

---

## Resolved (No Action Needed)

- ~~**Drizzle ORM version mismatch**~~ — `apps/telegram-bot` no longer has a direct `drizzle-orm` dependency; it uses `@newchat/db` as a workspace dependency.
- ~~**`MAX_FILE_SIZE` / `ALLOWED_CONTENT_TYPES` duplication**~~ — Already centralized in `lib/upload-constants.ts`.
- ~~**`TRPCError` with "JWT secret missing" in `trpc/init.ts`**~~ — No longer exists in the current code.
