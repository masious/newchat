# Database Schema Improvements

**Priority:** Medium
**Status:** Done

All changes are in `packages/db/src/schema.ts`.

## Items

### 1. Add Indexes

PostgreSQL doesn't auto-create indexes on FK columns. These are frequently queried/joined.

**Composite indexes (high priority):**
- `messages(conversationId, createdAt DESC)` — covers message list pagination, lateral join for last message in conversation summaries, and unread count subquery. This is the single most impactful index.
- `pushSubscriptions(userId, endpoint)` — queried in 4 places: subscribe dedup check, unsubscribe all, unsubscribe specific, and notification delivery. Also covers standalone `userId` lookups.
- `authTokens(status, createdAt)` — the cleanup job runs every 60s with `WHERE status = 'pending' AND created_at < cutoff`. A composite lets Postgres range-scan only pending tokens.

**Single-column indexes (high priority):**
- `conversationMembers.userId` (line 88) — the composite PK `(conversationId, userId)` does NOT cover lookups by `userId` alone. Queried on SSE init (get all conversations for a user) and in the conversation summaries query.
- `messages.senderId` (line 126) — used in inner joins with users and the `sender_id <> userId` filter in unread count subquery.

**Single-column indexes (only needed for cascade delete FK scanning):**
- `authTokens.userId` (line 59) — no query looks up tokens by `userId`, but Postgres needs this to efficiently find child rows during a cascaded user delete.

**Not needed (covered by existing constraints):**
- `readReceipts.userId` — the composite PK `(messageId, userId)` already covers the only query pattern: `LEFT JOIN rr ON rr.message_id = m2.id AND rr.user_id = X` (seeks `messageId` first).
- `messages.createdAt` standalone — useless alone; every query that orders by `createdAt` also filters by `conversationId`, so the composite index above covers it.

**Future consideration:**
- User search (`users.ts:73-80`) does `ILIKE '%term%'` on `username`, `firstName`, `lastName`. B-tree indexes cannot help `ILIKE` with a leading wildcard. If search becomes slow at scale, add `pg_trgm` GIN indexes on these columns.

### 2. Add Cascade Deletes

Only `pushSubscriptions` has `onDelete: "cascade"`. All others leave orphaned rows.

Add `{ onDelete: "cascade" }` to:
- `authTokens.userId` (line 59)
- `conversationMembers.conversationId` (line 87)
- `conversationMembers.userId` (line 90)
- `messages.conversationId` (line 125)
- `readReceipts.messageId` (line 152)
- `readReceipts.userId` (line 155)

Note: `messages.senderId` (line 128) should be `{ onDelete: "set null" }` rather than cascade — keeps messages from deleted users visible. **This requires making the column nullable first** (remove `.notNull()` on line 127), otherwise the migration will fail.

### 3. Unique Constraint on Push Subscription Endpoint — Line 178

Add a composite unique constraint on `(userId, endpoint)` to prevent duplicate subscriptions. The code already checks for duplicates in `push.ts:21`, but a DB constraint is the proper safeguard.

### 4. Consistent ID Column Types — Line 174

`pushSubscriptions` uses `serial("id").primaryKey()` while all other tables use `integer("id").primaryKey().generatedAlwaysAsIdentity()`. Change to match.

### 5. `users.updatedAt` Auto-Update — Line 43

`defaultNow()` only sets on INSERT. Currently the bot manually sets `updatedAt: new Date()` on upsert, but other update paths may miss it. Consider a DB trigger or ensure all update paths set it explicitly.

## Migration Notes

- Generate migration with `bun db:generate` after schema changes
- Test migration on a staging DB first — adding indexes is safe but cascade changes affect existing data integrity
- Verify no orphaned records exist before adding cascades (especially before adding cascade deletes on `messages.conversationId` and `conversationMembers`)
- The `messages.senderId` SET NULL change requires a two-step approach: make column nullable, then add the `onDelete: "set null"` reference
