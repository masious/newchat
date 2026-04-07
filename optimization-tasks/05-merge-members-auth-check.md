# 05 — Merge Auth Check + Members Fetch in `conversations.members`

## Problem

`getMembers` in `conversation-service.ts:89-96` runs two separate queries that both hit the `conversation_members` table for the same `conversationId`:

1. `ensureConversationMember` — SELECT from `conversation_members` JOIN `conversations` to verify the requesting user is a member
2. `getConversationMembers` — SELECT from `conversation_members` JOIN `users` to fetch all members

## Files Involved

- `apps/server/src/services/conversation-service.ts` (lines 89-96)
- `apps/server/src/services/authorization.ts` (`ensureConversationMember`)
- `apps/server/src/data/conversation-queries.ts` (`getConversationMembers`)

## Proposed Fix

Replace both queries with a single `getConversationMembers` call, then check if the requesting user's ID exists in the returned member list. If not, throw `ForbiddenError`. This performs both authorization and data fetching in one round-trip.

```typescript
export async function getMembers(db, input) {
  const members = await getConversationMembers(db, input.conversationId);
  if (!members.some(m => m.id === input.userId)) {
    throw new ForbiddenError("Not a conversation member");
  }
  return { members };
}
```

## Expected Savings

1 query per `conversations.members` call.
