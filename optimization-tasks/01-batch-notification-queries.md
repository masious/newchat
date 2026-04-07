# 01 — Batch Notification Queries in `messages.send`

## Problem

When sending a message, the notification dispatch triggers N+1 database queries per recipient:

1. `getConversationMemberUserIds` fetches just user IDs (`conversation-queries.ts:203-211`)
2. For each recipient, `notifyUserOfMessage` calls `findUserById` (`notification-service.ts:23`)
3. For each recipient with web push enabled, `sendWebPushNotifications` calls `findUserPushSubscriptions` (`notification-service.ts:53`)

In a 10-member group chat this results in **~23 DB queries** per message send.

## Files Involved

- `apps/server/src/services/message-service.ts` (lines 78-96)
- `apps/server/src/services/notification-service.ts` (lines 22-50, 52-95)
- `apps/server/src/data/conversation-queries.ts` (`getConversationMemberUserIds`)
- `apps/server/src/data/user-queries.ts` (`findUserById`)
- `apps/server/src/data/push-queries.ts` (`findUserPushSubscriptions`)

## Proposed Fix

1. Replace `getConversationMemberUserIds` with a new query that fetches all members with their full user profile (including `notificationChannel` and `telegramId`) in a single query — essentially a variant of `getConversationMembers` that also selects notification-relevant columns.
2. Add a batch query `findPushSubscriptionsForUsers(db, userIds: number[])` that fetches all push subscriptions for multiple users at once using `WHERE userId IN (...)`.
3. Refactor `notifyUserOfMessage` to accept a pre-fetched user object instead of a `recipientUserId`, eliminating the per-recipient `findUserById` call.

## Expected Savings

~18 queries eliminated in a 10-member group (from ~23 down to ~5).
