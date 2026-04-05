# Conversations (DM vs Group)

## Schema

```sql
conversations: { id, type ("dm"|"group"), name (nullable), created_at }
conversation_members: { conversation_id, user_id, joined_at } -- composite PK
```

- DMs have `type = "dm"`, `name = null`, exactly 2 members
- Groups have `type = "group"`, `name` is required, 2+ members

## New Conversation Dialog

The dialog (`apps/web/src/components/chat/new-chat-dialog.tsx`) supports two modes via a toggle:

- **DM mode**: Single-select `UserSearchCombobox` — user searches by name or username, picks one person
- **Group mode**: Multi-select `UserSearchCombobox` with chips — user searches and selects multiple people, plus enters a group name

The `UserSearchCombobox` (`apps/web/src/components/chat/user-search-combobox.tsx`) uses Base UI's `Combobox` with server-side filtering (`filter={null}`). It calls the existing `users.search` tRPC procedure with debounced input (250ms). Selected users are shown as removable chips in multi-select mode.

**Self-exclusion:** The `users.search` procedure automatically excludes the requesting user from results (`excludeUserId` threaded through the service layer), so users cannot add themselves to conversations.

**Existing DM detection:** When in DM mode, the dialog checks the cached `conversations.list` for an existing DM with the selected user. If found, the button changes to "Go to conversation" and navigates directly instead of creating a duplicate.

## Creating a DM

```
Web ──trpc──> conversations.create({ type: "dm", memberUserIds: [otherUserId] })

Server (apps/server/src/trpc/routers/conversations.ts:15-63):
  1. Deduplicate memberIds, ensure creator is included -> [currentUser, otherUser]
  2. Validate exactly 2 members
  3. Check for existing DM: SQL query joins conversation_members for both users
     where conversation.type = "dm" and member count = 2
  4. If exists -> return existing ConversationSummary
  5. If not -> INSERT conversation + INSERT conversation_members (in transaction)
  6. publishMembershipChange for each member -> { type: "join", conversationId, conversation }
  7. Return { conversation: ConversationSummary }
```

DM deduplication prevents creating duplicate DMs between the same two users.

## Creating a Group

```
Web ──trpc──> conversations.create({ type: "group", memberUserIds: [...], name: "My Group" })

Server:
  1. Validates: name required, at least 2 members
  2. INSERT conversation { type: "group", name }
  3. INSERT conversation_members for all members
  4. publishMembershipChange for each member
  5. Return { conversation: ConversationSummary }
```

## Group Name Display

Group names are persisted in the `conversations.name` column and displayed in the sidebar (`ConversationListItem`) and chat header (`ChatHeader`). The `getConversationName()` function in `apps/web/src/lib/formatting.ts` uses the stored name for groups, falling back to joining member first names for legacy groups without a name.

## ConversationSummary Shape

This is the main data shape used across the app. Defined in `apps/server/src/trpc/types.ts`:

```typescript
{
  id: number;
  type: "dm" | "group";
  name: string | null;           // null for DMs
  createdAt: Date;
  lastMessage: {                 // null if no messages yet
    id: number;
    conversationId: number;
    content: string;
    attachments: Attachment[] | null;
    createdAt: Date;
    senderId: number;
  } | null;
  unreadCount: number;
  members: { id, username, firstName, lastName, avatarUrl }[];
  isTyping?: boolean;            // client-side only (set by SSE handler)
  typingUserId?: number;         // client-side only (set by SSE handler)
}
```

Note: `isTyping` and `typingUserId` are NOT from the database. They are injected into the React Query cache by the SSE event handler on the client.

## Conversation List Query

`conversations.list` uses a single SQL query with lateral joins (`apps/server/src/services/fetch-conversation-summaries.ts`) that fetches:
- All conversations the user is a member of
- The latest message per conversation (via `LEFT JOIN LATERAL`)
- Unread count per conversation (messages without read receipts from this user)
- All members per conversation (via `json_agg`)

Sorted by `COALESCE(last_message.created_at, conversation.created_at) DESC`.
