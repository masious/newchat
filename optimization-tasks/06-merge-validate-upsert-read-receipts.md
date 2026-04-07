# 06 — Merge Validate + Upsert in `messages.markRead`

## Problem

`markRead` in `message-service.ts:106-137` runs `validateMessageIds` as a separate SELECT before `upsertReadReceipts`:

1. `validateMessageIds` — SELECT from `messages` WHERE id IN (...) AND conversationId = ... (to confirm IDs belong to the conversation)
2. `upsertReadReceipts` — INSERT into `read_receipts` ON CONFLICT UPDATE

## Files Involved

- `apps/server/src/services/message-service.ts` (lines 116-127)
- `apps/server/src/data/message-queries.ts` (`validateMessageIds`, `upsertReadReceipts`)

## Proposed Fix

Combine validation into the upsert by using a subquery approach:

```sql
INSERT INTO read_receipts (message_id, user_id, read_at)
SELECT m.id, $userId, NOW()
FROM messages m
WHERE m.id = ANY($messageIds)
  AND m.conversation_id = $conversationId
ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = NOW()
```

Then compare the affected row count against `input.messageIds.length` to detect invalid IDs, replacing the separate validation query.

## Expected Savings

1 query per `markRead` call.
