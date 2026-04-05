# Authentication

**Auth is Telegram-based.** There are no passwords or OAuth providers. The web app creates a one-time token, the user confirms it via a Telegram bot, and the web app exchanges the confirmed token for a JWT.

## Token Creation

```
Web (login page) ──trpc──> auth.createToken ──> INSERT authTokens { token, status: "pending" }
                  <────── { token, expiresAt }
```

- **Router**: `apps/server/src/trpc/routers/auth.ts` `createToken` (line 11)
- Token is a `nanoid(32)` string
- TTL: 5 minutes (`TOKEN_TTL_MS = 5 * 60 * 1000`)
- Server has a background job (`expirePendingTokens`) that marks stale pending tokens as `"expired"` every 60 seconds (`apps/server/src/index.ts:30-46`)

## Telegram Deep Link Confirmation

```
User clicks:  https://t.me/{botUsername}?start={token}
                          |
                          v
Telegram Bot ──> /start handler (apps/telegram-bot/src/index.ts:15)
  1. Validate token format (regex: /^[a-zA-Z0-9_-]{32}$/)
  2. Upsert user  ──> INSERT/UPDATE users { telegramId, firstName, lastName, username }
  3. Confirm token ──> UPDATE authTokens SET status="confirmed", userId=user.id
                       WHERE token={payload} AND status="pending"
  4. Reply "You're signed in!"
```

- The bot upserts the user by `telegramId` (unique constraint) so returning users get updated profile info
- Token confirmation is atomic — the `WHERE status="pending"` prevents double-confirm

## Web App Polling & JWT Exchange

```
Web (login page) polls:   auth.pollToken({ token })
                          ──> SELECT status FROM authTokens WHERE token = ?
                          <── { status: "pending" | "confirmed" | "expired" }

When status === "confirmed":
  Web calls:              auth.exchange({ token })
                          ──> UPDATE authTokens SET status="expired" WHERE token=? AND status="confirmed"
                          ──> signToken(userId) -> JWT
                          <── { token: "<jwt>" }

Web stores JWT:           localStorage.setItem("newchat.jwt", jwt)
```

- **JWT structure** (`apps/server/src/lib/jwt.ts`):
  - Algorithm: `HS256`
  - Claims: `{ sub: userId (number), iss: "newchat-server", aud: "newchat-api" }`
  - Expiry: 7 days
- The exchange atomically marks the auth token as expired so it can't be reused

## Protected Procedures & Rate Limiting

```
Every tRPC request with auth:
  HTTP Header: Authorization: Bearer <jwt>
                     |
  createTRPCContext ──> extracts token from header
                     |
  enforceUser middleware ──> verifyToken(token) -> userId | null
                           if null -> UNAUTHORIZED
                           else -> ctx.userId = userId
                     |
  rateLimit middleware ──> checkRateLimit(redis, key, limit, windowSec)
                          key = "rl:{path}:user:{userId}"
```

- Defined in `apps/server/src/trpc/init.ts`
- `publicProcedure` = rate limit only (key by IP: `rl:{path}:ip:{ip}`)
- `protectedProcedure` = enforceUser -> rate limit (key by userId: `rl:{path}:user:{userId}`)

### Rate Limit Implementation

Fixed-window counter using Redis `INCR` + `EXPIRE` (`apps/server/src/lib/rate-limit.ts`).
Per-procedure limits configured in `apps/server/src/middleware/trpc-rate-limit.ts`:

| Procedure                | Limit   | Window  | Keyed By |
|--------------------------|---------|---------|----------|
| `auth.createToken`       | 5/min   | 60s     | IP       |
| `auth.pollToken`         | 30/min  | 60s     | IP       |
| `auth.exchange`          | 10/min  | 60s     | IP       |
| `messages.send`          | 60/min  | 60s     | userId   |
| `messages.typing`        | 20/min  | 60s     | userId   |
| `users.search`           | 20/min  | 60s     | userId   |
| `uploads.getPresignedUrl`| 20/min  | 60s     | userId   |
| `conversations.create`   | 10/min  | 60s     | userId   |
| `sse.createTicket`       | 10/min  | 60s     | userId   |
| *(all others)*           | 60/min  | 60s     | userId   |

The `/health` endpoint has its own Hono-level rate limit middleware (60/min by IP), separate from the tRPC pipeline.

## Auth Data Shapes

```
authTokens table row:
  { id, token, telegramId, status, userId, createdAt, updatedAt }
  status enum: "pending" | "confirmed" | "expired"

JWT payload (decoded):
  { sub: number, iss: "newchat-server", aud: "newchat-api", iat, exp }
```
