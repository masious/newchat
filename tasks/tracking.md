# Task Tracking

## Critical Priority

- [x] [01 — Auth Token Race Condition](./01-auth-token-race-condition.md) — Fix TOCTOU race in server token exchange and bot confirmation
- [x] [03 — Rate Limiting](./03-rate-limiting.md) — Add application-level rate limiting (Railway/Vercel don't provide this)

## High Priority

- [x] [02 — JWT Hardening](./02-jwt-hardening.md) — Add claims (iss/aud/alg), runtime validation, consider refresh tokens
- [x] [05 — Input Validation](./05-input-validation.md) — Telegram injection, unbounded arrays, markRead, username/avatar

## Medium Priority

- [x] [04 — SSE Improvements](./04-sse-improvements.md) — Ticket auth, stop logging tokens, connection max lifetime
- [x] [06 — Upload Security](./06-upload-security.md) — ContentLength enforcement, remove SVG, validate attachment URLs
- [x] [07 — Database Schema](./07-database-schema.md) — Missing indexes, cascade deletes, consistency
- [x] [08 — Frontend Robustness](./08-frontend-robustness.md) — Error boundaries, auth page guard, upload cancellation
- [ ] [09 — Server Hardening](./09-server-hardening.md) — Security headers, structured logging, bot error handling, auth header parsing
- [ ] [11 — Design System Consistency](./11-design-system-consistency.md) — Fix ~7 categories of UI inconsistencies to match design-system.md

## Low Priority

- [ ] [10 — Code Organization](./10-code-organization.md) — Centralize constants, align drizzle versions, generic error messages
- [x] [12 — Backend Layered Architecture Refactor](./12-backend-layered-architecture-refactor.md) — Restructure fat routers into thin routers → services → data access layer

## Dismissed / Not Applicable

- ~~1.A. Hardcoded JWT Secret~~ — Dev environment only, production uses secure secrets
- ~~1.D. CORS Wildcard~~ — Already fixed
- ~~1.L. LIKE Wildcards~~ — Search flow will be rewritten
- ~~2.B. SSE EventSource Leak~~ — Fixed with `user?.id` in dependency array
