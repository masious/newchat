# 12 — Backend Layered Architecture Refactor

Restructure the backend from the current "fat router" pattern to the three-layer architecture described in `docs/backend-architecture.md`: **thin routers → service functions → data access layer**.

## Current State

The codebase has a hybrid/inconsistent architecture:

| Layer | Target (from doc) | Current Reality |
|---|---|---|
| **Routers** | Thin shells (~20 lines): validate input, call service, shape response, translate errors | Fat routers with inline DB queries, authorization, event publishing, notification logic (40–90 lines per procedure) |
| **Services** | Plain async functions owning all business logic. Receive `db` + plain input. Throw domain errors. | Partial — 5 files exist, but only for complex queries and event wrappers. No `messageService.send()`, no `conversationService.create()`. |
| **Data Access** | Reusable, composable query builders. No business logic. | No layer at all — DB queries written inline in routers. Three `fetch-*.ts` files in `services/` are actually data access functions mislabeled as services. |
| **Authorization** | Called inside service functions | `ensureConversationMember` lives in `trpc/routers/helpers.ts` and throws `TRPCError` directly |
| **Errors** | Services throw domain errors; routers translate to tRPC codes | `TRPCError` thrown everywhere — routers, helpers, notification service |

### Per-Router Breakdown

| Router | Lines | Inline DB Queries | Inline Business Logic | Delegates to Service |
|---|---|---|---|---|
| `messages.ts` | 221 | `list` query, `send` insert+receipt+members, `markRead` validation+upsert | Authorization, notification fan-out, event publishing | `fetchMessageWithSender`, `publishConversationEvent`, `notifyUserOfMessage` |
| `conversations.ts` | 131 | `create` DM duplicate check (raw SQL), transaction insert | Member dedup, DM/group validation, membership event fan-out | `fetchConversationSummaries`, `fetchConversationMembers`, `publishMembershipChange` |
| `users.ts` | 144 | All 5 procedures — `me`, `update`, `search`, `profile`, `updateNotificationPreferences` | Profile visibility check, search ILIKE escaping, presence enrichment | None (only `getPresenceStatus` from lib) |
| `auth.ts` | 64 | All 3 procedures — `createToken`, `pollToken`, `exchange` | Token expiry check, status transitions | None (only `signToken` from lib) |
| `push.ts` | 80 | All 3 procedures — `subscribe`, `unsubscribe`, `unsubscribeEndpoint` | Find-or-update logic | None |
| `uploads.ts` | 39 | None | Content type + size validation | `getPresignedUploadUrl` from lib ✓ |
| `sse.ts` | 14 | None | None | Redis SET ✓ |

---

## Target State

After refactoring, the file tree under `apps/server/src/` should look like:

```
src/
├── index.ts
├── errors.ts                          # NEW — Domain error classes
├── lib/                               # Infrastructure (unchanged)
│   ├── jwt.ts
│   ├── presence.ts
│   ├── r2.ts
│   ├── rate-limit.ts
│   ├── redis.ts
│   ├── telegram-notifier.ts
│   ├── upload-constants.ts
│   └── web-push.ts
├── middleware/
│   ├── rate-limit.ts
│   └── trpc-rate-limit.ts
├── data/                              # NEW — Reusable query builders
│   ├── message-queries.ts             # listMessages, insertMessage, insertReadReceipt, validateMessageIds
│   ├── conversation-queries.ts        # findExistingDm, createConversationWithMembers, getConversationMembers
│   ├── user-queries.ts                # findUserById, updateUser, searchUsers, findUsersByIds
│   ├── auth-queries.ts                # insertAuthToken, findAuthToken, expireAuthToken, exchangeAuthToken
│   └── push-queries.ts               # findSubscription, upsertSubscription, deleteSubscriptions, deleteSubscriptionByEndpoint
├── services/                          # ALL business logic lives here
│   ├── message-service.ts             # NEW — send, markRead, list
│   ├── conversation-service.ts        # NEW — create, list, getMembers
│   ├── user-service.ts                # NEW — getProfile, update, search, getPresenceBatch, updateNotificationPreferences
│   ├── auth-service.ts                # NEW — createToken, pollToken, exchange
│   ├── push-service.ts               # NEW — subscribe, unsubscribe, unsubscribeEndpoint
│   ├── notification-service.ts        # EXISTING — keep, adjust to use data/ layer
│   └── realtime-events.ts             # EXISTING — keep as-is
└── trpc/
    ├── index.ts
    ├── init.ts
    ├── router.ts
    ├── types.ts
    └── routers/
        ├── auth.ts                    # SLIM DOWN
        ├── conversations.ts           # SLIM DOWN
        ├── messages.ts                # SLIM DOWN
        ├── push.ts                    # SLIM DOWN
        ├── sse.ts                     # KEEP (already thin)
        ├── uploads.ts                 # KEEP (already thin)
        └── users.ts                   # SLIM DOWN
```

Note: `helpers.ts` is deleted — its functions move into services and data layer.

---

## Refactoring Steps

### Phase 1: Foundations (no behavior change)

#### 1.1 — Create domain error classes

Create `src/errors.ts` with typed domain errors. Services will throw these instead of `TRPCError`.

```typescript
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ForbiddenError extends DomainError {}
export class NotFoundError extends DomainError {}
export class BadRequestError extends DomainError {}
export class UnauthorizedError extends DomainError {}
export class RateLimitError extends DomainError {
  constructor(
    message: string,
    public retryAfterSec: number,
  ) {
    super(message);
  }
}
```

#### 1.2 — Create a router-level error translation helper

Add a `mapDomainError` utility that routers will wrap service calls with:

```typescript
import { TRPCError } from "@trpc/server";
import { ForbiddenError, NotFoundError, BadRequestError, UnauthorizedError } from "../errors";

export function mapDomainError(err: unknown): never {
  if (err instanceof ForbiddenError) throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  if (err instanceof NotFoundError) throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  if (err instanceof BadRequestError) throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  if (err instanceof UnauthorizedError) throw new TRPCError({ code: "UNAUTHORIZED", message: err.message });
  throw err; // unknown error, let tRPC handle as INTERNAL_SERVER_ERROR
}
```

#### 1.3 — Create `data/` directory with empty files

Scaffold the data access files. They'll be filled in during Phase 2.

---

### Phase 2: Extract data access layer

Move all raw DB queries out of routers into composable functions in `data/`. Each function receives `db: Database` and returns data — no business logic, no authorization, no event publishing.

#### 2.1 — `data/message-queries.ts`

Extract from `messages.ts` router:

| Function | Source (current location) | What it does |
|---|---|---|
| `listMessages(db, { conversationId, cursor?, limit? })` | `messages.list` procedure (lines 36–69) | Paginated message+sender join query |
| `insertMessage(db, { conversationId, senderId, content, attachments })` | `messages.send` procedure (lines 108–116) | INSERT into messages, returns `{ id }` |
| `upsertReadReceipts(db, { messageIds, userId })` | `messages.send` (lines 118–128) + `messages.markRead` (lines 187–199) | INSERT read_receipts ON CONFLICT UPDATE |
| `validateMessageIds(db, { messageIds, conversationId })` | `messages.markRead` (lines 173–181) | SELECT message IDs that belong to conversation |

Also relocate `fetchMessageWithSender` from `services/fetch-message.ts` → `data/message-queries.ts` (it's a data access function, not a service).

#### 2.2 — `data/conversation-queries.ts`

Extract from `conversations.ts` router:

| Function | Source | What it does |
|---|---|---|
| `findExistingDm(db, userIdA, userIdB)` | `conversations.create` (lines 42–55) | Raw SQL to find existing DM between two users |
| `createConversationWithMembers(db, { type, name, memberIds })` | `conversations.create` (lines 76–95) | Transaction: INSERT conversation + INSERT members |
| `getConversationMembers(db, conversationId)` | `services/fetch-conversation-members.ts` | SELECT members with user details |

Also relocate `fetchConversationSummaries` / `fetchConversationSummary` from `services/fetch-conversation-summaries.ts` → `data/conversation-queries.ts`.

Delete `services/fetch-conversation-members.ts` and `services/fetch-message.ts` and `services/fetch-conversation-summaries.ts` after moving.

#### 2.3 — `data/user-queries.ts`

Extract from `users.ts` router:

| Function | Source | What it does |
|---|---|---|
| `findUserById(db, userId)` | `users.me` (lines 12–14), `users.profile` (lines 97–99) | `db.query.users.findFirst` |
| `updateUser(db, userId, fields)` | `users.update` (lines 34–44) | UPDATE users SET ... WHERE id |
| `searchUsers(db, { query, limit })` | `users.search` (lines 61–83) | ILIKE search across username/firstName/lastName |
| `findUsersByIds(db, userIds)` | `helpers.ensureUsersExist` (lines 32–36) | SELECT from users WHERE id IN (...) |
| `updateNotificationChannel(db, userId, channel)` | `users.updateNotificationPreferences` (lines 129–136) | UPDATE users SET notificationChannel |
| `getConversationMemberUserIds(db, conversationId)` | `messages.send` (lines 139–142) | SELECT userId from conversation_members |

#### 2.4 — `data/auth-queries.ts`

Extract from `auth.ts` router:

| Function | Source | What it does |
|---|---|---|
| `insertAuthToken(db, token)` | `auth.createToken` (line 13) | INSERT into authTokens |
| `findAuthToken(db, token)` | `auth.pollToken` (lines 22–25) | findFirst with status + createdAt |
| `expireAuthToken(db, tokenId)` | `auth.pollToken` (lines 35–37) | UPDATE status = expired |
| `exchangeConfirmedToken(db, token)` | `auth.exchange` (lines 47–56) | UPDATE WHERE status=confirmed, RETURNING |

#### 2.5 — `data/push-queries.ts`

Extract from `push.ts` router:

| Function | Source | What it does |
|---|---|---|
| `findPushSubscription(db, userId, endpoint)` | `push.subscribe` (lines 20–25) | findFirst by userId+endpoint |
| `updatePushSubscriptionKeys(db, subscriptionId, keys)` | `push.subscribe` (lines 29–35) | UPDATE p256dh+auth |
| `insertPushSubscription(db, { userId, endpoint, p256dh, auth })` | `push.subscribe` (lines 41–49) | INSERT into pushSubscriptions |
| `deleteUserSubscriptions(db, userId)` | `push.unsubscribe` (lines 55–57) | DELETE WHERE userId |
| `deleteSubscriptionByEndpoint(db, userId, endpoint)` | `push.unsubscribeEndpoint` (lines 69–75) | DELETE WHERE userId+endpoint |

---

### Phase 3: Create service functions

Each service is a plain async function. It receives `db: Database` and a typed input object (no tRPC context). It orchestrates data access calls, performs authorization, publishes events, and throws domain errors.

#### 3.1 — `services/message-service.ts`

Create with three functions:

**`list(db, { conversationId, senderId, cursor?, limit? })`**
1. Call `ensureConversationMember(db, conversationId, senderId)` — throws `ForbiddenError`
2. Call `listMessages(db, ...)` from data layer
3. Return `{ messages, nextCursor }`

**`send(db, { conversationId, senderId, content, attachments })`**
1. Call `ensureConversationMember(db, conversationId, senderId)` — returns conversation
2. Call `insertMessage(db, ...)`
3. Call `upsertReadReceipts(db, { messageIds: [created.id], userId: senderId })`
4. Call `fetchMessageWithSender(db, created.id)`
5. Call `publishConversationEvent(conversationId, { type: "new_message", ... })`
6. Call `getConversationMemberUserIds(db, conversationId)`
7. Fire-and-forget: `notifyUserOfMessage(...)` for each non-sender member
8. Return `{ message }`

**`markRead(db, { conversationId, userId, messageIds })`**
1. Call `ensureConversationMember(db, conversationId, userId)` — throws `ForbiddenError`
2. Call `validateMessageIds(db, ...)` — throws `BadRequestError` if mismatch
3. Call `upsertReadReceipts(db, ...)`
4. Call `publishConversationEvent(conversationId, { type: "message_read", ... })`
5. Return `{ success: true }`

**`typing(db, { conversationId, userId })`** (small, but keeps routers consistent)
1. Call `ensureConversationMember(db, conversationId, userId)`
2. Call `publishConversationEvent(conversationId, { type: "typing", ... })`

#### 3.2 — `services/conversation-service.ts`

**`create(db, { creatorId, type, memberUserIds, name? })`**
1. Deduplicate + normalize member IDs (always include creatorId)
2. Call `findUsersByIds(db, memberIds)` via `ensureUsersExist` — throws `BadRequestError`
3. If DM: validate exactly 2 members, call `findExistingDm(db, ...)` — if found, return existing summary
4. If group: validate name present, at least 2 members — throw `BadRequestError` on violations
5. Call `createConversationWithMembers(db, ...)`
6. Call `fetchConversationSummary(db, ...)` for creator
7. For each member, fetch their summary and call `publishMembershipChange(...)`
8. Return `{ conversation }`

**`list(db, { userId })`** — thin wrapper, call `fetchConversationSummaries(db, userId)`

**`getMembers(db, { conversationId, userId })`**
1. Call `ensureConversationMember(db, conversationId, userId)`
2. Call `getConversationMembers(db, conversationId)`

#### 3.3 — `services/user-service.ts`

**`getMe(db, userId)`**
1. Call `findUserById(db, userId)` — throw `NotFoundError` if null

**`update(db, userId, { username, displayName, avatar?, isPublic? })`**
1. Call `updateUser(db, userId, fields)` — throw `NotFoundError` if no row returned

**`search(db, { query, limit? })`**
1. Call `searchUsers(db, ...)` from data layer
2. Enrich each row with `getPresenceStatus(id)` from lib/presence
3. Return enriched list

**`getProfile(db, { targetUserId, requesterId })`**
1. Call `findUserById(db, targetUserId)` — throw `NotFoundError` if null
2. If `!user.isPublic && user.id !== requesterId` — throw `ForbiddenError`
3. Enrich with `getPresenceStatus(targetUserId)`

**`getPresenceBatch(userIds)`** — maps to `getPresenceStatus` calls (thin, may keep in router)

**`updateNotificationPreferences(db, userId, channel)`**
1. Call `updateNotificationChannel(db, userId, channel)` — throw `NotFoundError` if no row

#### 3.4 — `services/auth-service.ts`

**`createToken(db)`**
1. Generate nanoid
2. Call `insertAuthToken(db, token)`
3. Return `{ token, expiresAt }`

**`pollToken(db, token)`**
1. Call `findAuthToken(db, token)` — return `{ status: "expired" }` if not found
2. If pending + past TTL: call `expireAuthToken(db, tokenId)`, return expired
3. Return `{ status }`

**`exchange(db, token)`**
1. Call `exchangeConfirmedToken(db, token)` — throw `UnauthorizedError` if no row or no userId
2. Call `signToken(userId)` from lib/jwt
3. Return `{ token: jwt }`

#### 3.5 — `services/push-service.ts`

**`subscribe(db, userId, subscription)`**
1. Call `findPushSubscription(db, userId, endpoint)`
2. If exists: call `updatePushSubscriptionKeys(db, ...)`, return `{ subscriptionId }`
3. Else: call `insertPushSubscription(db, ...)`, return `{ subscriptionId }`

**`unsubscribe(db, userId)`**
1. Call `deleteUserSubscriptions(db, userId)`

**`unsubscribeEndpoint(db, userId, endpoint)`**
1. Call `deleteSubscriptionByEndpoint(db, userId, endpoint)`

#### 3.6 — Update `services/notification-service.ts`

Replace its inline DB queries with calls to data layer functions:
- Query user preferences → `findUserById` or a new `getUserNotificationPrefs` in `data/user-queries.ts`
- Query push subscriptions → `findUserPushSubscriptions` in `data/push-queries.ts`
- Delete expired subscription → `deletePushSubscriptionById` in `data/push-queries.ts`

#### 3.7 — Move authorization helpers

Move `ensureConversationMember` and `ensureUsersExist` from `trpc/routers/helpers.ts` into the services layer (e.g., a shared `services/authorization.ts` or inline in each service that needs them). Change them to throw `ForbiddenError` / `BadRequestError` instead of `TRPCError`. Delete `helpers.ts`.

---

### Phase 4: Slim down routers

Rewrite each router to be a thin shell. Every procedure should follow this pattern:

```typescript
procedureName: protectedProcedure
  .input(schema)
  .mutation(async ({ ctx, input }) => {
    try {
      return await someService.doThing(ctx.db, { ...input, userId: ctx.userId! });
    } catch (err) {
      throw mapDomainError(err);
    }
  }),
```

#### 4.1 — Rewrite `messages.ts`

- `list`: validate input → `messageService.list(ctx.db, { ...input, senderId: ctx.userId })` → return
- `send`: validate input → `messageService.send(ctx.db, { ...input, senderId: ctx.userId })` → return
- `markRead`: validate input → `messageService.markRead(ctx.db, { ...input, userId: ctx.userId })` → return
- `typing`: validate input → `messageService.typing(ctx.db, { ...input, userId: ctx.userId })` → return

**Expected: ~50 lines** (down from 221)

#### 4.2 — Rewrite `conversations.ts`

- `list`: → `conversationService.list(ctx.db, { userId: ctx.userId })` → return
- `create`: validate input → `conversationService.create(ctx.db, { ...input, creatorId: ctx.userId })` → return
- `members`: validate input → `conversationService.getMembers(ctx.db, { ...input, userId: ctx.userId })` → return

**Expected: ~40 lines** (down from 131)

#### 4.3 — Rewrite `users.ts`

- `me`: → `userService.getMe(ctx.db, ctx.userId)` → return
- `update`: → `userService.update(ctx.db, ctx.userId, input)` → return
- `search`: → `userService.search(ctx.db, input)` → return
- `profile`: → `userService.getProfile(ctx.db, { targetUserId: input.userId, requesterId: ctx.userId })` → return
- `presence`: → `userService.getPresenceBatch(input.userIds)` → return
- `updateNotificationPreferences`: → `userService.updateNotificationPreferences(ctx.db, ctx.userId, input.channel)` → return

**Expected: ~70 lines** (down from 144)

#### 4.4 — Rewrite `auth.ts`

- `createToken`: → `authService.createToken(ctx.db)` → return
- `pollToken`: → `authService.pollToken(ctx.db, input.token)` → return
- `exchange`: → `authService.exchange(ctx.db, input.token)` → return

**Expected: ~35 lines** (down from 64)

#### 4.5 — Rewrite `push.ts`

- `subscribe`: → `pushService.subscribe(ctx.db, ctx.userId, input.subscription)` → return
- `unsubscribe`: → `pushService.unsubscribe(ctx.db, ctx.userId)` → return
- `unsubscribeEndpoint`: → `pushService.unsubscribeEndpoint(ctx.db, ctx.userId, input.endpoint)` → return

**Expected: ~35 lines** (down from 80)

#### 4.6 — Keep `uploads.ts` and `sse.ts`

Already thin enough. No changes needed.

---

### Phase 5: Verification

#### 5.1 — Lint + type check

Run `bun lint` and `tsc --noEmit` to catch any broken imports, missing types, or unused variables.

#### 5.2 — Manual smoke test

Start the dev server (`bun dev`) and verify:
- Auth flow (create token → poll → exchange)
- Conversation creation (DM + group)
- Message send + real-time delivery via SSE
- Message list with pagination
- Read receipts
- User search + profile
- File upload presigned URL
- Push subscribe/unsubscribe
- Typing indicator

#### 5.3 — Verify no behavior change

The refactoring is strictly structural. Every tRPC procedure must return the same response shape and error codes as before. No new features, no removed features.

---

## Execution Order & Dependencies

```
Phase 1 (foundations)     → No dependencies, do first
  1.1 errors.ts
  1.2 mapDomainError helper
  1.3 scaffold data/ directory

Phase 2 (data layer)     → Depends on Phase 1
  2.1–2.5 can be done in any order (independent files)

Phase 3 (services)        → Depends on Phase 2 (services import from data/)
  3.7 authorization helpers → do first (services depend on them)
  3.1–3.5 can be done in any order
  3.6 notification-service update → do after 2.5 (needs push-queries)

Phase 4 (slim routers)    → Depends on Phase 3 (routers import from services/)
  4.1–4.5 can be done in any order
  Delete helpers.ts after 4.1–4.3 (last consumers)

Phase 5 (verification)    → Do last
```

## Risk Notes

- **No API contract change**: tRPC procedure names, input schemas, and response shapes must remain identical. The client code should not need any changes.
- **Error codes preserved**: The mapping from domain errors to tRPC error codes must match current behavior exactly (e.g., non-member still gets `FORBIDDEN`, invalid token still gets `UNAUTHORIZED`).
- **Fire-and-forget semantics preserved**: Notification fan-out in `messageService.send` must still use `Promise.allSettled` and never block the response.
- **Transaction boundaries preserved**: `conversationService.create` must keep the DB transaction around conversation + members insert.
