# 04 — Make `ensureConversationMember` Conversation JOIN Conditional

## Problem

`ensureConversationMember` (`authorization.ts:15-23`) always loads the conversation relation via `with: { conversation: true }`, adding an unnecessary JOIN. However, only 1 out of 5 callers (`messages.send`) actually uses the returned conversation object.

Callers that ignore the return value:
- `messages.list`
- `messages.markRead`
- `messages.typing`
- `conversations.members`

## Files Involved

- `apps/server/src/services/authorization.ts` (lines 10-28)
- `apps/server/src/services/message-service.ts` (callers at lines 25, 52, 114, 143)
- `apps/server/src/services/conversation-service.ts` (caller at line 93)

## Proposed Fix

Add an optional parameter to `ensureConversationMember`:

```typescript
export async function ensureConversationMember(
  db: Database,
  conversationId: number,
  userId: number,
  options?: { includeConversation?: boolean },
)
```

When `includeConversation` is false (or omitted), skip the `with: { conversation: true }` relation, turning the query into a simple index lookup on `conversation_members`.

Only `messages.send` would pass `{ includeConversation: true }`.

## Expected Savings

Removes an unnecessary JOIN from 4 out of 5 call sites.
