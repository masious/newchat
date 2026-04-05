# SSE Security & Stability

**Priority:** High
**Status:** Todo

## Items

### 1. Replace JWT in URL with One-Time Ticket — `apps/server/src/index.ts:86`

JWT is passed as `?token=<jwt>` in the SSE URL. It leaks into server logs, proxy logs, and browser history.

**Fix:**
- Add a `sse.createTicket` tRPC procedure (protected) that generates a short-lived token (30s TTL, single-use, stored in Redis)
- Client calls this endpoint, gets a ticket, passes it as `?ticket=<ticket>` in the SSE URL
- SSE endpoint validates the ticket against Redis, deletes it immediately, then proceeds with the connection using the resolved userId

### 2. Stop Logging Tokens — `apps/server/src/index.ts:65-70`

The request logger logs the full URL including query params.

**Fix:**

```typescript
const url = new URL(c.req.url);
console.log(`${c.req.method} ${url.pathname} - ${ms}ms`);
```

### 3. SSE Connection Limits — `apps/server/src/index.ts:85-229`

Connections stay open indefinitely with no per-user limit. Each holds a Redis subscriber + intervals.

**Fix:**
- Track active connections per user in Redis
- Reject new connections beyond limit (e.g., 2-3 per user)
- Add max connection lifetime (e.g., 24h), after which server closes and client reconnects

### 4. SSE Cache Update Race — `apps/web/src/lib/hooks/use-sse.ts:51-119`

When a message arrives, the cache is updated twice (messages list, then conversations list). Another event between them can cause inconsistency.

**Fix:** Consider batching cache updates or wrapping in `queryClient.setQueriesData` to reduce the window.
