# 03 — Eliminate Re-fetch After `insertMessage`

## Problem

`insertMessage` (`message-queries.ts:55-74`) returns only `{ id }` from the INSERT. Immediately after, `fetchMessageWithSender` (`message-service.ts:70`) runs a second SELECT with a JOIN to `users` to read back the same row plus sender info.

The sender data is already known — the authenticated user is the sender, and their profile is available in the request context.

## Files Involved

- `apps/server/src/data/message-queries.ts` (`insertMessage`, `fetchMessageWithSender`)
- `apps/server/src/services/message-service.ts` (lines 58-70)

## Proposed Fix

1. Expand `insertMessage`'s `.returning()` to include all message columns (`id`, `conversationId`, `content`, `attachments`, `createdAt`).
2. Compose the full message-with-sender object in the service layer by combining the returned row with sender info from context (the sender is the authenticated user — their profile is already available or can be passed through).
3. Remove the `fetchMessageWithSender` call entirely.

## Expected Savings

1 query per message send.
