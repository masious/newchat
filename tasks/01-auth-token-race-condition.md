# Auth Token Race Condition (TOCTOU)

**Priority:** Critical
**Status:** Done

## Problem

Both the server token exchange and telegram bot token confirmation have Time-of-Check to Time-of-Use race conditions. The code reads the token status, checks it, then updates — allowing two concurrent requests to both succeed.

## Items

### 1. Server: Token Exchange Race — `apps/server/src/trpc/routers/auth.ts:47-71`

Two concurrent `exchange` calls with the same token can both read `status === "confirmed"` before either marks it `"expired"`. Both get valid JWTs.

**Fix:** Use atomic update with status check in WHERE clause:

```typescript
const [record] = await ctx.db
  .update(authTokens)
  .set({ status: "expired", updatedAt: new Date() })
  .where(
    and(
      eq(authTokens.token, input.token),
      eq(authTokens.status, "confirmed"),
    ),
  )
  .returning();

if (!record || !record.userId) {
  throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
}

// Now sign the JWT — only one request can reach here per token
const signedToken = jwt.sign({ userId: record.userId }, jwtSecret, { expiresIn: "7d" });
```

### 2. Telegram Bot: Token Confirmation Race — `apps/telegram-bot/src/index.ts:34-66`

Same pattern — two users clicking the same deep link simultaneously can both confirm the token.

**Fix:** Same atomic approach — add `AND status = 'pending'` to the UPDATE WHERE clause instead of doing a separate SELECT + check + UPDATE.

```typescript
const [updated] = await db
  .update(authTokens)
  .set({ status: "confirmed", telegramId, userId: user.id, updatedAt: new Date() })
  .where(
    and(
      eq(authTokens.token, payload),
      eq(authTokens.status, "pending"),
    ),
  )
  .returning();

if (!updated) {
  await ctx.reply("This login link is invalid or has expired.");
  return;
}
```
