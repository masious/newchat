# Idempotency

Mutations that can cause duplicate side effects on network retries are protected via two strategies:

1. **`idempotent()` handler wrapper** — Redis-backed response cache keyed by an `idempotencyKey` field in the input. Wraps any `protectedProcedure` mutation.
2. **Service-layer Redis cache** — for `auth.exchange`, where the auth token itself is the natural dedup key (no userId in context).

## When to use idempotency

A mutation needs idempotency protection when **all** of the following are true:
- It performs an `INSERT` or has external side effects (notifications, pub/sub, file writes)
- The same logical operation should not be applied twice (i.e., not naturally idempotent like an upsert or `SET` operation)
- Clients may retry it (network failures, user double-clicks, React Query retry policy)

Mutations that are **naturally idempotent** (no protection needed):
- `users.update`, `users.updateNotificationPreferences` — `UPDATE ... SET` semantics
- `messages.markRead` — upsert on `(messageId, userId)`
- `messages.typing`, presence heartbeats — ephemeral Redis writes
- `push.subscribe`, `push.unsubscribe*` — upsert / delete with composite key

## `idempotent()` wrapper (the generic pattern)

Defined in [apps/server/src/lib/idempotency.ts](../apps/server/src/lib/idempotency.ts).

### Server-side wiring

```ts
import { protectedProcedure } from "../init";
import { idempotent } from "../../lib/idempotency";

send: protectedProcedure
  .input(
    z.object({
      idempotencyKey: z.string().uuid(),  // REQUIRED on every idempotent mutation
      // ...other fields
    }),
  )
  .mutation(
    idempotent("messages.send", async ({ ctx, input }) => {
      const { idempotencyKey: _idempotencyKey, ...rest } = input;
      return await someService.do(ctx.db, { ...rest, userId: ctx.userId });
    }),
  );
```

Three things are required:
1. The input schema must include `idempotencyKey: z.string().uuid()`.
2. The handler must be wrapped with `idempotent(path, ...)`.
3. The first argument is the procedure path (e.g. `"messages.send"`) — used to namespace the cache key.

### How it works

1. Build Redis key: `idem:user:{userId}:{path}:{idempotencyKey}`
2. Read Redis. If hit → return parsed value, skip handler entirely
3. Cache miss → run handler
4. Write successful response to Redis with `IDEMPOTENCY_TTL_SEC` (1 hour)
5. Errors are NOT cached — they propagate and the next retry runs fresh

If Redis is unreachable, the wrapper logs a warning and proceeds without caching — the mutation still executes correctly, just without idempotency protection.

### Client-side usage

The client must generate a stable UUID per logical user action and include it in the mutation input. React Query retries reuse the same input, so the same key flows through automatically.

```ts
const optimisticId = crypto.randomUUID();
await sendMessage.mutateAsync({
  idempotencyKey: optimisticId,
  conversationId,
  content,
});
```

For message sending, the client reuses the existing `_optimisticId` (also used for SSE deduplication) — see [apps/web/src/components/chat/message-input/index.tsx](../apps/web/src/components/chat/message-input/index.tsx).

For retry of a failed message, the **original** `_optimisticId` is reused — see [apps/web/src/components/chat/chat-panel/index.tsx](../apps/web/src/components/chat/chat-panel/index.tsx). This means if the original send actually succeeded server-side but the client never received the response, the retry returns the cached response without creating a duplicate.

## `auth.exchange` (service-layer cache)

`auth.exchange` is a `publicProcedure` (no `userId` in context), so the generic middleware doesn't apply. Instead, the service caches the JWT in Redis keyed by the auth token:

- Redis key: `auth:exchange:{authToken}`
- TTL: `EXCHANGE_CACHE_TTL_SEC` (60 seconds — long enough for network retries, short because the auth token itself is single-use)
- On retry, the cached JWT is returned instead of failing with `UnauthorizedError("Invalid or expired token")`

See [apps/server/src/services/auth-service.ts](../apps/server/src/services/auth-service.ts).

## Procedures protected

| Procedure | Strategy | Key derivation |
|---|---|---|
| `auth.exchange` | Service-layer Redis cache | The auth token (input) |
| `messages.send` | `idempotent("messages.send", ...)` | Client-supplied `idempotencyKey` (reuses `_optimisticId`) |
| `conversations.create` | `idempotent("conversations.create", ...)` | Client-supplied `idempotencyKey` |

## Redis keys reference

| Pattern | TTL | Purpose |
|---|---|---|
| `idem:user:{userId}:{procedurePath}:{idempotencyKey}` | 1 hour | Cached mutation response |
| `auth:exchange:{authToken}` | 60s | Cached JWT for auth.exchange retries |

## Constants

Defined in [apps/server/src/lib/constants.ts](../apps/server/src/lib/constants.ts):

- `IDEMPOTENCY_TTL_SEC = 3600` — 1 hour
- `EXCHANGE_CACHE_TTL_SEC = 60` — 60 seconds
