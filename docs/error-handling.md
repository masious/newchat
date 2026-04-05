# Error Handling

## tRPC Error Codes

All server errors use `TRPCError` with standard codes. The tRPC layer maps these to HTTP status codes automatically.

| Code                   | HTTP | Used For                                                        |
|------------------------|------|-----------------------------------------------------------------|
| `UNAUTHORIZED` (401)   | 401  | Missing/invalid JWT, expired auth token                         |
| `FORBIDDEN` (403)      | 403  | Not a conversation member, viewing private profile              |
| `BAD_REQUEST` (400)    | 400  | Invalid input, DM not exactly 2 members, missing group name, disallowed content type |
| `NOT_FOUND` (404)      | 404  | User not found (me, update, profile)                            |
| `TOO_MANY_REQUESTS` (429) | 429 | Rate limit exceeded                                          |
| `INTERNAL_SERVER_ERROR` (500) | 500 | Conversation summary unavailable after creation            |

### Where Each Code Is Thrown

**UNAUTHORIZED** — `apps/server/src/trpc/init.ts`
- `enforceUser` middleware: no token provided, or `verifyToken()` returns null

**FORBIDDEN** — `apps/server/src/trpc/routers/helpers.ts`, `users.ts`
- `ensureConversationMember()`: user is not in the conversation (no message, just code)
- `users.profile`: accessing a private user's profile (`isPublic === false` and not self)

**BAD_REQUEST** — multiple routers
- `conversations.create`: DM without exactly 2 members, group missing name, group with <2 members
- `messages.markRead`: provided messageIds don't all belong to the conversation
- `uploads.getPresignedUrl`: disallowed content type, file size exceeds 10MB
- `helpers.ensureUsersExist()`: one or more member IDs don't exist in the database
- Zod validation failures (automatic — invalid input shape/constraints)

**NOT_FOUND** — `users.ts`
- `users.me`, `users.update`, `users.updateNotificationPreferences`: user record doesn't exist

**TOO_MANY_REQUESTS** — `apps/server/src/trpc/init.ts`
- `rateLimit` middleware: request count exceeds per-procedure limit

---

## ensureConversationMember

**File**: `apps/server/src/trpc/routers/helpers.ts`

Shared authorization check used across multiple procedures. Verifies the current user is a member of the given conversation.

```typescript
ensureConversationMember(db, conversationId, userId)
  → SELECT * FROM conversationMembers
    WHERE conversationId = ? AND userId = ?
    JOIN conversation
  → If no row: throw TRPCError({ code: "FORBIDDEN" })
  → Returns: conversation object (for further use in the procedure)
```

**Used in**:
| Procedure           | Purpose                                      |
|---------------------|----------------------------------------------|
| `messages.list`     | Can only view messages in own conversations  |
| `messages.send`     | Can only send to own conversations           |
| `messages.markRead` | Can only mark read in own conversations      |
| `messages.typing`   | Can only send typing to own conversations    |
| `conversations.members` | Can only view members of own conversations |

The error is intentionally generic (no message) — doesn't reveal whether the conversation exists or the user simply isn't in it.

---

## Rate Limit Error Responses

See [auth.md](auth.md) for the full rate limit table and configuration.

**tRPC layer** (`apps/server/src/trpc/init.ts`):
```
TRPCError({ code: "TOO_MANY_REQUESTS", message: "Rate limit exceeded" })
```

**HTTP layer** (`apps/server/src/middleware/rate-limit.ts`) — for `/health` endpoint:
```
HTTP 429 { error: "Too many requests" }
Headers: Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

**SSE endpoint** (`apps/server/src/index.ts`):
```
HTTP 429 when user exceeds MAX_SSE_CONNECTIONS (5 concurrent)
```

Rate limit headers are exposed via CORS so the client can read them:
- `X-RateLimit-Limit` — max requests in window
- `X-RateLimit-Remaining` — requests left
- `X-RateLimit-Reset` — Unix timestamp when window resets
- `Retry-After` — seconds until retry (only on 429)

---

## Client-Side Error Handling

### Auth Error Detection

**File**: `apps/web/src/lib/providers/auth-context.tsx`

The `users.me` query watches for auth failures:

```
meQuery error detected:
  → If httpStatus is 401 or 403:
    1. Clear JWT from localStorage
    2. Dispatch "newchat:auth-expired" CustomEvent on window
    3. AuthExpiredListener shows toast: "Your session has expired. Please log in again."
  → Retry policy: don't retry 401s, retry transient errors up to 3 times
```

### Toast Notifications

**File**: `apps/web/src/lib/providers/toast-context.tsx`

Global toast system with three types: `"error" | "success" | "info"`. Default timeout: 4000ms.

```typescript
addToast(message: string, type?: ToastType)  // callable anywhere via import
useToast() → { addToast, removeToast }       // React hook version
```

### Mutation Error Patterns

Most mutations follow this pattern:

```typescript
const mutation = trpc.something.useMutation({
  onSuccess: async () => {
    await utils.someQuery.invalidate();  // refresh cache
  },
  onError: (err) => {
    setError(err.message ?? "Fallback message");  // display in local UI state
  },
});
```

**Specific patterns by component**:

| Component           | Error Display                   | Notes                              |
|---------------------|----------------------------------|------------------------------------|
| `new-chat-dialog`   | Local `error` state in dialog   | "Unable to create conversation"    |
| `profile-dialog`    | Local `error` state in dialog   | "Failed to update profile"         |
| `onboarding/page`   | Local `error` state on page     | "Failed to save profile"           |
| `message-input`     | Toast notification              | Also marks optimistic message as failed |
| File upload          | Toast notification              | "Failed to upload file"            |

### Optimistic Message Failure

When `messages.send` fails after optimistic insertion:

```
1. markOptimisticFailed(optimisticId) — flags entry in optimistic store
2. Updates React Query cache: message status set to show failure state
3. addToast(err.message) — shows error to user
```

### Sentry Integration

**File**: `apps/web/src/lib/providers/trpc-provider.tsx`

A custom tRPC link captures all errors to Sentry:

```
Every tRPC error → Sentry.captureException(err, {
  tags: { trpc_procedure, trpc_type },
  contexts: { procedure, type, input, code, httpStatus }
})
```

This fires for all procedures (queries and mutations) without any component-level setup.
