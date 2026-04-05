# Task Tracking

## Critical Priority

- [x] [01 — Auth Token Race Condition](./01-auth-token-race-condition.md) — Fix TOCTOU race in server token exchange and bot confirmation
- [ ] [03 — Rate Limiting](./03-rate-limiting.md) — Add application-level rate limiting (Railway/Vercel don't provide this)

## High Priority

- [x] [02 — JWT Hardening](./02-jwt-hardening.md) — Add claims (iss/aud/alg), runtime validation, consider refresh tokens
- [ ] [04 — SSE Improvements](./04-sse-improvements.md) — Ticket auth, stop logging tokens, connection limits
- [ ] [05 — Input Validation](./05-input-validation.md) — Telegram injection, unbounded arrays, markRead, username/avatar

## Medium Priority

- [ ] [06 — Upload Security](./06-upload-security.md) — ContentLength enforcement, remove SVG, validate attachment URLs
- [ ] [07 — Database Schema](./07-database-schema.md) — Missing indexes, cascade deletes, consistency
- [ ] [08 — Frontend Robustness](./08-frontend-robustness.md) — Error boundaries, auth page guard, upload cancellation
- [ ] [09 — Server Hardening](./09-server-hardening.md) — Security headers, structured logging, bot error handling, auth header parsing

## Low Priority

- [ ] [10 — Code Organization](./10-code-organization.md) — Centralize constants, align drizzle versions, generic error messages

## Dismissed / Not Applicable

- ~~1.A. Hardcoded JWT Secret~~ — Dev environment only, production uses secure secrets
- ~~1.D. CORS Wildcard~~ — Already fixed
- ~~1.L. LIKE Wildcards~~ — Search flow will be rewritten
- ~~2.B. SSE EventSource Leak~~ — Fixed with `user?.id` in dependency array
