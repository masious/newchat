# 02 — Reuse Conversation Summary in `conversations.create`

## Problem

After creating a new conversation, `fetchConversationSummary` is called individually for each non-creator member to publish the membership change event (`conversation-service.ts:73-84`).

At creation time, the conversation has no messages, so `unreadCount = 0` and `lastMessage = null` for every member. The members list is identical for all. Despite this, each call runs the full lateral-join summary SQL.

For a 5-member group: **4 redundant summary queries**.

## Files Involved

- `apps/server/src/services/conversation-service.ts` (lines 64-84)
- `apps/server/src/data/conversation-queries.ts` (`fetchConversationSummary`, `fetchConversationSummaries`)

## Proposed Fix

Since all summaries are identical at creation time (no messages, 0 unread, same members), fetch the summary once for the creator and reuse it for all members when publishing the membership change event. The only difference would be the perspective user, but with no messages that distinction is irrelevant.

## Expected Savings

N-2 queries per conversation creation (e.g., 3 fewer for a 5-member group).
