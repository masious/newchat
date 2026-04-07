# Query Optimization Tracking

## Overview

Identified 7 optimization opportunities to reduce database round-trips across backend services. Ordered by impact.

## Tasks

- [ ] **01 — Batch notification queries in `messages.send`** (~18 queries saved in 10-member group)
  See [01-batch-notification-queries.md](./01-batch-notification-queries.md)

- [ ] **02 — Reuse conversation summary in `conversations.create`** (~N-2 queries saved)
  See [02-conversation-create-summary-reuse.md](./02-conversation-create-summary-reuse.md)

- [ ] **03 — Eliminate re-fetch after `insertMessage`** (1 query saved per send)
  See [03-insert-message-returning-all.md](./03-insert-message-returning-all.md)

- [ ] **04 — Make `ensureConversationMember` conversation JOIN conditional** (removes JOIN from 4/5 callers)
  See [04-conditional-conversation-join.md](./04-conditional-conversation-join.md)

- [ ] **05 — Merge auth check + members fetch in `conversations.members`** (1 query saved)
  See [05-merge-members-auth-check.md](./05-merge-members-auth-check.md)

- [ ] **06 — Merge validate + upsert in `messages.markRead`** (1 query saved)
  See [06-merge-validate-upsert-read-receipts.md](./06-merge-validate-upsert-read-receipts.md)

- [ ] **07 — Replace find-then-insert with upsert in `push.subscribe`** (1 query saved)
  See [07-push-subscribe-upsert.md](./07-push-subscribe-upsert.md)

## Impact Summary

| # | Procedure | Current | After | Saved |
|---|-----------|:-------:|:-----:|:-----:|
| 01 | `messages.send` (10-member group) | ~23 | ~5 | ~18 |
| 02 | `conversations.create` (5-member group) | ~8 | ~5 | ~3 |
| 03 | `messages.send` (re-fetch) | 5 core | 4 core | 1 |
| 04 | `ensureConversationMember` (4 callers) | JOIN each | no JOIN | 4 JOINs |
| 05 | `conversations.members` | 2 | 1 | 1 |
| 06 | `messages.markRead` | 3 | 2 | 1 |
| 07 | `push.subscribe` | 2 | 1 | 1 |
