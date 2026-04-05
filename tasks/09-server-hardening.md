# Server Hardening

**Priority:** Medium
**Status:** Todo

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

For the Next.js web app, add equivalent headers in `next.config.js` via the `headers()` function.

### 2. Structured Logging — `apps/server/src/index.ts`, all routers

Replace `console.log` with a structured logger (e.g., `pino`). Current logging:
- Includes sensitive data (JWTs in URLs at line 69)
- Lacks log levels, timestamps, and context
- Makes production debugging difficult

### 3. Telegram Bot Error Handling — `apps/telegram-bot/src/index.ts:16-69`

No `try-catch` around any DB operation. If the database is down, the bot crashes and users get no response.

**Fix:** Wrap the handler body in try-catch:

```typescript
bot.command("start", async (ctx) => {
  try {
    // ... existing logic
  } catch (error) {
    console.error("Error handling /start command:", error);
    await ctx.reply("Something went wrong. Please try again later.").catch(() => {});
  }
});
```

### 4. Authorization Header Parsing — `apps/server/src/trpc/init.ts:21`

Current `replace("Bearer ", "")` is case-sensitive and doesn't validate format.

**Fix:**

```typescript
const authHeader = c.req.header("authorization");
const token = authHeader?.match(/^Bearer\s+(\S+)$/i)?.[1];
```
