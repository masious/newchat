# JWT Hardening

**Priority:** High
**Status:** Done

## Items

### 1. Add Standard Claims & Pin Algorithm on Sign — `apps/server/src/trpc/routers/auth.ts:68-70`

JWT is signed with only `{ userId }` and no `issuer`, `audience`, or `algorithm` restriction. This leaves the token vulnerable to algorithm-confusion attacks (e.g. `alg: "none"`).

Additionally, the custom `userId` claim should be renamed to the standard `sub` claim. This is a **breaking change** — both verify sites and all downstream `payload.userId` references must be updated (see Items 2 and 3).

**Fix:**

```typescript
const signedToken = jwt.sign({ sub: record.userId }, jwtSecret, {
  expiresIn: "7d",
  issuer: "newchat-server",
  audience: "newchat-api",
  algorithm: "HS256",
});
```

### 2. Pin Algorithm & Validate Payload on Verify (tRPC middleware) — `apps/server/src/trpc/init.ts:41-42`

The `jwt.verify` call has no algorithm restriction and uses an unsafe `as { userId: number }` cast. A crafted token with `userId: "admin"` would pass the type assertion at runtime.

**Fix:**

```typescript
const payload = jwt.verify(ctx.token, jwtSecret, {
  issuer: "newchat-server",
  audience: "newchat-api",
  algorithms: ["HS256"],
});
if (typeof payload !== "object" || typeof payload.sub !== "number") {
  throw new TRPCError({ code: "UNAUTHORIZED" });
}
return next({ ctx: { ...ctx, userId: payload.sub } });
```

### 3. Pin Algorithm & Validate Payload on Verify (SSE endpoint) — `apps/server/src/index.ts:94-98`

Same issues as Item 2, but in a plain Hono route — must use `c.json()` responses instead of `TRPCError`. The `let payload` variable and all downstream references (`payload.userId` at lines 102, 118, 123, 134, 221) must also update to `payload.sub`.

**Fix:**

```typescript
let payload: { sub: number };
try {
  const verified = jwt.verify(token, jwtSecret, {
    issuer: "newchat-server",
    audience: "newchat-api",
    algorithms: ["HS256"],
  });
  if (typeof verified !== "object" || typeof verified.sub !== "number") {
    return c.json({ error: "Invalid token" }, 401);
  }
  payload = verified as { sub: number };
} catch {
  return c.json({ error: "Invalid token" }, 401);
}
```

Then update all downstream references in the SSE handler:
- `markOnline(payload.sub)` (line 102)
- `user:${payload.sub}:membership` (line 118)
- `setPresenceStatus(payload.sub, ...)` (line 123)
- `userId: payload.sub` in the init SSE event (line 134)
- `markOffline(payload.sub)` (line 221)

### 4. (Future) Short-Lived Tokens + Refresh Flow

Current 7-day JWT cannot be revoked. Consider:
- Reduce JWT lifetime to 15-60 minutes
- Add refresh tokens stored in DB (revocable)
- Add a "logout all sessions" feature
