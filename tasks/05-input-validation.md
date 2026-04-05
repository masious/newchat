# Input Validation & Injection Prevention

**Priority:** High / Medium
**Status:** Todo

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

**Fix:** Add a WHERE check that all messageIds belong to the conversationId before inserting read receipts.

### 4. Username Format Validation — `apps/server/src/trpc/routers/users.ts:23` (LOW)

No regex — allows unicode homoglyphs, control characters, HTML tags.

**Fix:**

```typescript
username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/)
```

### 5. Avatar URL Validation — `apps/server/src/trpc/routers/users.ts:25` (LOW)

Not validated as URL, no domain restriction. Can be tracking pixels or internal network resources.

**Fix:** Use `z.string().url()` and restrict to your R2 public URL domain.

### 6. Deep Link Payload Validation — `apps/telegram-bot/src/index.ts:17` (LOW)

`ctx.match` is used without format validation before DB query.

**Fix:** Validate nanoid format: `if (!/^[a-zA-Z0-9_-]{32}$/.test(payload)) return;`
