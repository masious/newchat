# 07 — Replace Find-Then-Insert with Upsert in `push.subscribe`

## Problem

`push-service.ts:10-33` uses a find-then-conditionally-update/insert pattern:

1. `findPushSubscription` — SELECT to check if a subscription exists for the user + endpoint
2. If found: `updatePushSubscriptionKeys` — UPDATE the keys
3. If not found: `insertPushSubscription` — INSERT a new row

This is always 2 queries. The upsert pattern is already used elsewhere in the codebase (`upsertReadReceipts` in `message-queries.ts`).

## Files Involved

- `apps/server/src/services/push-service.ts` (lines 10-33)
- `apps/server/src/data/push-queries.ts` (`findPushSubscription`, `updatePushSubscriptionKeys`, `insertPushSubscription`)

## Proposed Fix

Replace the three separate query functions with a single upsert:

```typescript
export async function upsertPushSubscription(
  db: Database,
  input: { userId: number; endpoint: string; p256dh: string; auth: string },
) {
  const [result] = await db
    .insert(pushSubscriptions)
    .values(input)
    .onConflictDoUpdate({
      target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
      set: { p256dh: input.p256dh, auth: input.auth },
    })
    .returning({ id: pushSubscriptions.id });
  return result;
}
```

Note: This requires a unique constraint on `(userId, endpoint)`. Verify this exists or add a migration.

## Expected Savings

1 query per `push.subscribe` call.
