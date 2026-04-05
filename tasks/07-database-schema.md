# Database Schema Improvements

**Priority:** Medium
**Status:** Todo

All changes are in `packages/db/src/schema.ts`.

## Items

### 1. Add Indexes on Foreign Key Columns

PostgreSQL doesn't auto-create indexes on FK columns. These are frequently queried/joined.

Add indexes to:
- `messages.conversationId` (line 123) — used in every message list query
- `messages.senderId` (line 126) — used in message sender lookups
- `messages.createdAt` (line 131) — used for ordering/pagination
- `conversationMembers.userId` (line 88) — used to find a user's conversations
- `readReceipts.userId` (line 153) — used in read receipt lookups
- `authTokens.createdAt` (line 60) — scanned by cleanup job every 60 seconds
- `authTokens.userId` (line 59)

### 2. Add Cascade Deletes

Only `pushSubscriptions` has `onDelete: "cascade"`. All others leave orphaned rows.

Add `{ onDelete: "cascade" }` to:
- `authTokens.userId` (line 59)
- `conversationMembers.conversationId` (line 87)
- `conversationMembers.userId` (line 90)
- `messages.conversationId` (line 125)
- `readReceipts.messageId` (line 152)
- `readReceipts.userId` (line 155)

Note: `messages.senderId` (line 128) might be better as `SET NULL` rather than cascade — you may want to keep messages from deleted users.

### 3. Unique Constraint on Push Subscription Endpoint — Line 178

Add `.unique()` to `pushSubscriptions.endpoint` or a composite unique on `(userId, endpoint)` to prevent duplicate subscriptions.

### 4. Consistent ID Column Types — Line 174

`pushSubscriptions` uses `serial("id").primaryKey()` while all other tables use `integer("id").primaryKey().generatedAlwaysAsIdentity()`. Change to match.

### 5. `users.updatedAt` Auto-Update — Line 43

`defaultNow()` only sets on INSERT. Currently the bot manually sets `updatedAt: new Date()` on upsert, but other update paths may miss it. Consider a DB trigger or ensure all update paths set it explicitly.

## Migration Notes

- Generate migration with `bun db:generate` after schema changes
- Test migration on a staging DB first — adding indexes is safe but cascade changes affect existing data integrity
- Verify no orphaned records exist before adding cascades
