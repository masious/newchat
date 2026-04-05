# Input Validation & Injection Prevention

**Priority:** High / Medium
**Status:** Done

## Items

### 1. Telegram Markdown Injection — `apps/server/src/lib/telegram-notifier.ts:26-28` (HIGH)

User-controlled `senderName`, `conversationName`, and `content` are interpolated directly into Telegram Markdown. Attacker can inject clickable links into other users' notifications.

**Fix:** Either escape Markdown special characters (`*`, `_`, `[`, `]`, `(`, `)`, `` ` ``, `~`) or switch to `parse_mode: undefined` (plain text).

```typescript
function escapeMarkdown(text: string): string {
  return text.replace(/[*_[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}
```

### 2. Unbounded `userIds` in Presence Lookup — `apps/server/src/trpc/routers/users.ts:106-116` (MEDIUM)

No `.max()` on the array — attacker can send 100K IDs causing 100K concurrent Redis GETs.

**Fix:** Add `.max(100)` to the zod schema:

```typescript
userIds: z.array(z.number().int().positive()).max(100)
```

### 3. `markRead` Doesn't Verify Message Ownership — `apps/server/src/trpc/routers/messages.ts:148-181` (MEDIUM)

Checks conversation membership but doesn't verify that `messageIds` belong to the specified `conversationId`. A member of conversation A can mark messages from conversation B as read.

**Fix:** Query messages to confirm all IDs belong to the conversation before inserting read receipts:

```typescript
const validMessages = await ctx.db
  .select({ id: messages.id })
  .from(messages)
  .where(
    and(
      inArray(messages.id, input.messageIds),
      eq(messages.conversationId, input.conversationId),
    ),
  );
if (validMessages.length !== input.messageIds.length) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid messageIds" });
}
```

### 4. Username Format Validation — `apps/server/src/trpc/routers/users.ts:23` (LOW)

No regex — allows unicode homoglyphs, control characters, HTML tags.

**Fix:**

```typescript
username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/)
```

### 5. Avatar URL Validation — `apps/server/src/trpc/routers/users.ts:25` (LOW)

Not validated as URL, no domain restriction. Can be tracking pixels or internal network resources. Note: `.url()` alone is insufficient — it still allows arbitrary external URLs.

**Fix:** Use `z.string().url()` **and** restrict to the R2 public URL domain:

```typescript
avatar: z.string().url().max(2048)
  .refine(url => url.startsWith(process.env.R2_PUBLIC_URL!),
    "Avatar must be hosted on our CDN")
  .optional(),
```

### 6. Deep Link Payload Validation — `apps/telegram-bot/src/index.ts:17` (LOW)

`ctx.match` is used without format validation before DB query.

**Fix:** Validate nanoid format: `if (!/^[a-zA-Z0-9_-]{32}$/.test(payload)) return;`

### 7. ILIKE Wildcard Injection in User Search — `apps/server/src/trpc/routers/users.ts:56` (MEDIUM)

Search query is interpolated into an ILIKE pattern without escaping `%` and `_` metacharacters. A query of `%` or `_` matches every user in the database, enabling full-table scans and user enumeration.

**Fix:** Escape LIKE metacharacters before wrapping with wildcards:

```typescript
const escaped = input.query.replace(/[%_\\]/g, "\\$&");
const term = `%${escaped}%`;
```

### 8. Unbounded `memberUserIds` in Conversation Create — `apps/server/src/trpc/routers/conversations.ts:19` (MEDIUM)

No `.max()` on the `memberUserIds` array. An attacker can send thousands of IDs, causing a large `inArray` query in `ensureUsersExist` and a massive bulk insert in the transaction.

**Fix:** Add `.max(100)` to the zod schema:

```typescript
memberUserIds: z.array(z.number().int().positive()).max(100)
```

### 9. Search Query Has No Max Length — `apps/server/src/trpc/routers/users.ts:50` (LOW)

`query: z.string().min(1)` has no upper bound. Combined with ILIKE, a multi-KB search string creates unnecessary DB load.

**Fix:**

```typescript
query: z.string().min(1).max(100)
```

### 10. Auth Token Format Not Validated — `apps/server/src/trpc/routers/auth.ts:20,45` (LOW)

`pollToken` and `exchange` accept `z.string().min(1)` — any string hits the DB. Tokens are always nanoid(32).

**Fix:** Validate nanoid format in both procedures:

```typescript
token: z.string().regex(/^[a-zA-Z0-9_-]{32}$/)
```
