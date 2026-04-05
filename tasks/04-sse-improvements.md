# SSE Security & Stability

**Priority:** Medium
**Status:** Todo

## Items

### 1. Replace JWT in URL with One-Time Ticket — `apps/server/src/index.ts:100`

JWT is passed as `?token=<jwt>` in the SSE URL. It leaks into server logs, proxy logs, and browser history.

**Fix:**
- Add a `sse.createTicket` tRPC procedure (protected) that generates a short-lived token (30s TTL, single-use, stored in Redis)
- Client calls this endpoint, gets a ticket, passes it as `?ticket=<ticket>` in the SSE URL
- SSE endpoint validates the ticket against Redis, deletes it immediately, then proceeds with the connection using the resolved userId

### 2. Stop Logging Tokens — `apps/server/src/index.ts:76-81`

The request logger logs the full URL including query params.

**Fix:**

```typescript
const url = new URL(c.req.url);
console.log(`${c.req.method} ${url.pathname} - ${ms}ms`);
```

### 3. SSE Max Connection Lifetime — `apps/server/src/index.ts:100-248`

~~Per-user connection limit~~ — already implemented (max 5 via Redis concurrency counter). Connections still stay open indefinitely; each holds a Redis subscriber + intervals.

**Remaining fix:**
- Add max connection lifetime (e.g., 24h), after which server closes and client reconnects

