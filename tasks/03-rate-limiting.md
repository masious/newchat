# Rate Limiting

**Priority:** Critical
**Status:** Done

## Problem

No rate limiting on any endpoint. This must be implemented in the Hono server.

## Approach

Use a Redis-backed sliding window rate limiter. The existing Redis connection can be reused.

## Endpoints to Rate Limit

| Endpoint | Suggested Limit | Reason |
|----------|----------------|--------|
| `auth.createToken` | 5/min per IP | Prevent token flood filling `auth_tokens` table |
| `auth.pollToken` | 30/min per IP | Prevent brute-force token guessing |
| `auth.exchange` | 10/min per IP | Prevent brute-force exchange |
| `messages.send` | 60/min per user | Prevent message spam |
| `messages.typing` | 10/min per user | Prevent excessive Redis publishes |
| `users.search` | 20/min per user | Prevent user enumeration |
| `uploads.getPresignedUrl` | 20/min per user | Prevent R2 resource abuse |
| `/events` SSE | 5 concurrent per user | Prevent connection flood |
| `/health` | 60/min per IP | Prevent amplification |

## Implementation Notes

- IP-based limiting for unauthenticated endpoints (auth.*)
- User-based limiting for authenticated endpoints
- Consider Hono community rate-limiting middleware or a simple custom Redis `INCR` + `EXPIRE` approach
- Also limit concurrent SSE connections per user (track in Redis, reject new ones beyond threshold)
