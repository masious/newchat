# Code Organization

**Priority:** Low
**Status:** Todo

## Items

### 1. Centralize Shared Constants

`TOKEN_TTL_MS = 5 * 60 * 1000` is defined in two places:
- `apps/server/src/index.ts:20`
- `apps/server/src/trpc/routers/auth.ts:9`

Other candidates: `MAX_FILE_SIZE`, `ALLOWED_CONTENT_TYPES`, JWT expiry duration.

**Fix:** Create a shared constants file (e.g., `apps/server/src/lib/constants.ts`) and import from there.

### 2. Align Drizzle ORM Versions

- `packages/db/package.json` has `drizzle-orm: ^0.38`
- `apps/telegram-bot/package.json` has `drizzle-orm: ^0.45.2`

Different major versions may have API differences.

**Fix:** Align both to the latest version. Since `packages/db` is the shared package, the telegram bot should use the DB package's drizzle version (via the workspace dependency).

### 3. Internal Error Message Leakage — `apps/server/src/trpc/init.ts:37`

```typescript
throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "JWT secret missing" });
```

Tells attackers about missing config. Return generic messages to clients, log details server-side.
