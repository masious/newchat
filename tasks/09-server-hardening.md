# Server Hardening

**Priority:** Medium
**Status:** Done

## Items

### 1. Security Headers — `apps/server/src/index.ts`

Railway does NOT add security headers. Add a Hono middleware early in the chain:

```typescript
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
});
```

For the Next.js web app, add equivalent headers in `next.config.ts` via the `headers()` function.

### 2. Structured Logging — `apps/server/src/index.ts`, `lib/`, `services/`

Replace `console.log` with a structured logger (`pino`). Current logging:
- Lacks log levels, timestamps, and context
- Makes production debugging difficult
- Spread across `index.ts`, `lib/redis.ts`, `lib/web-push.ts`, `lib/telegram-notifier.ts`, `services/message-service.ts`, `services/notification-service.ts`
- Request logger lacks status code and request ID

### 3. Telegram Bot Error Handling — `apps/telegram-bot/src/index.ts:15-71`

No `try-catch` around any DB operation. If the database is down, the bot crashes and users get no response.

**Fix:** Wrap the handler body in try-catch:

```typescript
bot.command("start", async (ctx) => {
  try {
    // ... existing logic
  } catch (error) {
    logger.error({ error }, "Error handling /start command");
    await ctx.reply("Something went wrong. Please try again later.").catch(() => {});
  }
});
```

### 4. Authorization Header Parsing — `apps/server/src/trpc/init.ts:28`

Current `replace("Bearer ", "")` is case-sensitive and doesn't validate format.

**Fix:**

```typescript
const authHeader = c.req.header("authorization");
const token = authHeader?.match(/^Bearer\s+(\S+)$/i)?.[1];
```
