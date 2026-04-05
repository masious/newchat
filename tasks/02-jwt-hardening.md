# JWT Hardening

**Priority:** High
**Status:** Todo

## Items

### 1. Add Standard Claims — `apps/server/src/trpc/routers/auth.ts:60-63`

JWT is signed with only `{ userId }` and no `issuer`, `audience`, or `algorithm` restriction.

**Fix:**

```typescript
// Signing (auth.ts)
const signedToken = jwt.sign({ sub: record.userId }, jwtSecret, {
  expiresIn: "7d",
  issuer: "newchat-server",
  audience: "newchat-api",
  algorithm: "HS256",
});
```

### 2. Pin Algorithm on Verify — `apps/server/src/trpc/init.ts:41`, `apps/server/src/index.ts:98`

Both verify calls should specify allowed algorithms and validate payload at runtime.

**Fix:**

```typescript
const payload = jwt.verify(token, jwtSecret, {
  issuer: "newchat-server",
  audience: "newchat-api",
  algorithms: ["HS256"],
});
if (typeof payload !== "object" || typeof payload.sub !== "number") {
  throw new TRPCError({ code: "UNAUTHORIZED" });
}
```

### 3. Runtime Payload Validation — `apps/server/src/trpc/init.ts:41`

Currently uses unsafe `as { userId: number }` cast. A crafted token with `userId: "admin"` passes the type assertion.

**Fix:** Validate at runtime with zod or a manual check before trusting the payload.

### 4. (Future) Short-Lived Tokens + Refresh Flow

Current 7-day JWT cannot be revoked. Consider:
- Reduce JWT lifetime to 15-60 minutes
- Add refresh tokens stored in DB (revocable)
- Add a "logout all sessions" feature
