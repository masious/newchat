# Frontend Architecture

This document defines the architectural patterns and design decisions for the Next.js web app. It covers how state is managed, how components are organized, and how real-time data flows from the server to the UI.

## Provider Tree

The root layout (`app/layout.tsx`) wraps the entire app in a provider hierarchy. Order matters — each provider depends on the ones above it.

```
<TrpcProvider>              ← React Query + tRPC client (everything needs data fetching)
  <ToastProvider>           ← Toast notifications (used by auth + mutations)
    <AuthProvider>          ← JWT token + user state (needs tRPC to call users.me)
      <RealtimeProvider>    ← SSE connection (needs auth token for ticket creation)
        <AuthGuard>         ← Route protection (needs auth status to redirect)
          {children}        ← Page content
        </AuthGuard>
      </RealtimeProvider>
    </AuthProvider>
  </ToastProvider>
</TrpcProvider>
```

A synchronous `<script>` in `<head>` reads `newchat.theme` from localStorage and applies the dark mode class before React hydrates — this prevents a flash of wrong theme.

## State Management Strategy

There is no global state library (no Redux, no Zustand). State is distributed across four layers, each with a clear purpose:

### React Query — Server State

React Query (via `@trpc/react-query`) is the primary state store. All data from the server lives here.

```
┌──────────────────────────────────────────────────────────────────┐
│  React Query Cache                                               │
│                                                                  │
│  conversations.list     ← useQuery (full list, sorted)           │
│  messages.list          ← useInfiniteQuery (per conversation)    │
│  users.me               ← useQuery (current user profile)        │
│  users.search           ← useQuery (conditional, ≥2 chars)       │
│  users.profile          ← useQuery (per user)                    │
│  users.presence         ← useQuery (per user set)                │
│                                                                  │
│  Updated by: tRPC queries, SSE event handlers, optimistic writes │
│  Config: staleTime 30s (default)                                 │
└──────────────────────────────────────────────────────────────────┘
```

Rules:
- **Server data lives in React Query, nowhere else.** No `useState` copies of fetched data.
- **SSE events update the cache directly** via `trpc.useUtils()` — they don't trigger refetches.
- **Mutations that need immediate UI feedback** use optimistic updates (message send) or cache invalidation (read receipts).

### React Context — Auth State

A single context (`AuthProvider`) manages authentication. It's the only React context in the app.

```typescript
type AuthContext = {
  status: "loading" | "authenticated" | "unauthenticated";
  isAuthenticated: boolean;
  token: string | null;
  user: CurrentUser | null;
  login(token: string): void;
  logout(): void;
  refreshUser(): void;
};
```

Hydration strategy:
1. On mount, read JWT from localStorage (`newchat.jwt`)
2. If token exists, call `users.me` to validate and fetch user
3. If `users.me` returns 401/403, clear token and dispatch `newchat:auth-expired` event
4. Set `status` to `"authenticated"` or `"unauthenticated"`

The token is also cached in memory (`auth-storage.ts`) to avoid repeated localStorage reads. The tRPC client reads from this cache on every request to set the `Authorization` header.

### localStorage — Persistent Preferences

Small user preferences that should survive page reloads. All reads/writes go through `safeLocalStorage` (`lib/safe-local-storage.ts`), which wraps `window.localStorage` in try/catch and falls back to an in-memory `Map` when localStorage is unavailable (private browsing, quota exceeded, SSR). The `<head>` script in `layout.tsx` is the only exception — it runs before React hydration and uses its own IIFE with silent failure.

| Key | Value | Used By |
|---|---|---|
| `newchat.jwt` | JWT string | AuthProvider, tRPC headers |
| `newchat.theme` | `"dark"` or absent | Dark mode toggle, `<head>` script |
| `newchat.muted` | `"true"` or absent | Notification sound toggle |

### URL — Navigation State

The URL is the source of truth for "where the user is":

| Route | State in URL | Purpose |
|---|---|---|
| `/chat?conversationId=123` | Selected conversation | Direct link to a conversation |
| `/auth?next=/chat` | Post-login redirect target | Deep linking through auth flow |

The selected conversation is driven by a query parameter, not component state. This means:
- Conversations are linkable/shareable
- Browser back/forward works naturally
- Refreshing the page reopens the same conversation

## Component Organization

Components follow a feature-based structure. Each feature owns its components, hooks, and types.

```
components/
├── auth-guard.tsx                           # Route protection + redirect
├── chat/
│   ├── chat-panel/                          # Right side — message thread
│   │   ├── index.tsx                        # Orchestrator: virtualized list + input
│   │   ├── components/                      # Presentational sub-components
│   │   │   ├── ChatHeader.tsx               # Title, member info, presence
│   │   │   ├── DateSeparator.tsx            # "Today", "Yesterday" between messages
│   │   │   ├── TypingBubble.tsx             # Animated dots
│   │   │   ├── TypingFooter.tsx             # "User is typing..." status
│   │   │   ├── DragOverlay.tsx              # File drop visual feedback
│   │   │   ├── EmptyMessages.tsx            # No messages state
│   │   │   └── LoadingMessages.tsx          # Skeleton loading
│   │   ├── hooks/                           # Logic extraction
│   │   │   ├── useVirtualizedMessages.ts    # Infinite query + scroll management
│   │   │   ├── useMarkReadOnVisible.ts      # IntersectionObserver → markRead
│   │   │   └── useDragAndDrop.ts            # File drop detection
│   │   └── types.ts
│   ├── message-bubble/                      # Single message card
│   │   ├── index.tsx
│   │   └── components/
│   │       ├── AttachmentPreview.tsx         # Image/file display
│   │       ├── CheckIcon.tsx                # Sent indicator
│   │       └── DoubleCheckIcon.tsx          # Read indicator
│   ├── message-input/                       # Compose area
│   │   ├── index.tsx                        # forwardRef — exposes addFiles()
│   │   ├── components/
│   │   │   ├── MessageTextarea.tsx           # Auto-resize input
│   │   │   ├── AttachButton.tsx              # File picker trigger
│   │   │   ├── EmojiButton.tsx              # Emoji picker
│   │   │   └── PendingAttachments.tsx       # Upload progress bars
│   │   └── hooks/
│   │       ├── useFileAttachments.ts        # File state + upload coordination
│   │       ├── useTypingIndicator.ts        # Throttled typing notification
│   │       └── useAutoResizeTextarea.ts     # Dynamic textarea height
│   ├── conversation-sidebar/                # Left side — conversation list
│   │   ├── index.tsx                        # List + search + user card
│   │   └── components/
│   │       ├── ConversationListItem.tsx     # Single conversation row
│   │       ├── SearchInput.tsx              # Filter input
│   │       ├── CurrentUserCard.tsx          # Bottom card with avatar + settings
│   │       ├── SidebarHeader.tsx            # User menu popover + new chat button
│   │       └── EmptyState.tsx
│   ├── new-chat-dialog.tsx                  # Create DM or group
│   ├── user-search-combobox.tsx             # Combobox for user search (single/multi-select)
│   ├── use-combobox-search.ts               # Search/debounce logic extracted from combobox
│   └── user-result-list.tsx                 # User search results
├── users/
│   ├── profile-dialog.tsx                   # View profile modal (read-only)
│   ├── edit-profile-dialog/                 # Edit profile modal (avatar, name, username)
│   │   ├── index.tsx                        # Dialog shell + profile section
│   │   ├── components/
│   │   │   ├── ProfileSection.tsx           # Centered avatar with hover overlay, name, username
│   │   │   └── DialogFooter.tsx             # Cancel + Save buttons
│   │   ├── hooks/
│   │   │   └── useEditProfileForm.ts        # Profile state, validation, avatar upload
│   │   └── types.ts                         # NotificationChannel type
│   └── settings-dialog/                     # Settings modal (preferences + notifications)
│       ├── index.tsx                        # Dialog shell with settings + notification sections
│       ├── components/
│       │   ├── SettingsSection.tsx           # Dark mode, notification sound toggles
│       │   ├── NotificationSection.tsx       # Telegram + browser notification toggles
│       │   └── DialogFooter.tsx             # Cancel + Save buttons
│       └── hooks/
│           └── useSettingsForm.ts           # Notification preferences state + mutation
└── ui/
    ├── skeleton.tsx                          # Loading placeholder
    ├── icon-tooltip.tsx                      # Hover tooltip
    ├── toast-container.tsx                   # Toast notification display
    ├── feature-boundary.tsx                  # React error boundary (per-feature)
    └── offline-banner.tsx                    # SSE disconnected banner + reconnect
```

### Patterns

**Feature folders**: Each feature (chat-panel, message-input, conversation-sidebar, edit-profile-dialog) is self-contained with its own `index.tsx`, `components/`, `hooks/`, and `types.ts`. This keeps related code together and makes it easy to find things.

**Smart/dumb split**: The `index.tsx` of each feature folder is the "smart" component — it fetches data, manages state, and passes it down. The `components/` folder contains presentational components that receive props and render UI.

**Custom hooks for logic**: Any logic more complex than "set state on click" goes into a custom hook. This keeps components focused on rendering and makes logic testable in isolation.

**Imperative handles**: `MessageInput` uses `forwardRef` + `useImperativeHandle` to expose `addFiles()` to its parent (ChatPanel). This lets drag-and-drop on the panel add files to the input without prop drilling.

**Error boundaries**: `FeatureBoundary` (`components/ui/feature-boundary.tsx`) is a React class component that wraps each feature. It catches render errors and logs them to the console. Three fallback modes: `"card"` (error card with retry), `"inline"` (single-line bar), `"hidden"` (minimal placeholder). Used around ChatPanel, ConversationSidebar, MessageInput, MessageBubble, RealtimeProvider, NewChatDialog, ProfileDialog, and EditProfileDialog.

## Data Fetching Patterns

### Queries — Read Data

```typescript
// Standard query — runs on mount, refetches when stale
const { data } = trpc.conversations.list.useQuery();

// Conditional query — only runs when the condition is met
const { data } = trpc.users.search.useQuery(
  { query: searchTerm },
  { enabled: searchTerm.length >= 2, staleTime: 60_000 }
);

// Infinite query — cursor-based pagination
const { data, fetchNextPage, hasNextPage } = trpc.messages.list.useInfiniteQuery(
  { conversationId },
  { getNextPageParam: (lastPage) => lastPage.nextCursor }
);
```

### Mutations — Write Data

```typescript
// Fire-and-forget
const sendMessage = trpc.messages.send.useMutation();
await sendMessage.mutateAsync({ conversationId, content, attachments });

// With side effects
const createConversation = trpc.conversations.create.useMutation({
  onSuccess: (data) => {
    utils.conversations.list.invalidate();
    router.replace(`/chat?conversationId=${data.id}`);
  },
});
```

### Cache Manipulation — Direct Updates

SSE events and optimistic updates modify the cache directly instead of triggering refetches:

```typescript
const utils = trpc.useUtils();

// Update a specific conversation's lastMessage in the list
utils.conversations.list.setData(undefined, (prev) =>
  prev?.map(c => c.id === id ? { ...c, lastMessage: msg } : c)
);

// Prepend a message to an infinite query
utils.messages.list.setInfiniteData({ conversationId }, (prev) => ({
  ...prev,
  pages: [{ ...prev.pages[0], messages: [newMsg, ...prev.pages[0].messages] }, ...prev.pages.slice(1)],
}));

// Full invalidation when cache is likely stale (e.g., after SSE reconnect)
utils.conversations.list.invalidate();
utils.messages.list.invalidate();
```

## Real-Time Cache Updates

The SSE hook (`use-sse.ts`) is the bridge between server-side Redis pub/sub and the React Query cache. When an SSE event arrives, the hook updates the cache immediately — no refetch round-trip.

```
SSE Event                         Cache Update
─────────                         ────────────

conversation_event
  type: "new_message"     ──►     1. Match optimistic message (by content + conversationId)
                                  2. If match: swap temp ID → real ID in messages cache
                                     If no match: prepend to first page of messages cache
                                  3. Update conversations.list: set lastMessage, bump unreadCount
                                  4. Re-sort conversations by most recent activity
                                  5. Clear typing indicator for this conversation
                                  6. Dispatch "newchat:new-message" CustomEvent (sound)

  type: "typing"          ──►     1. Skip if from current user
                                  2. Set isTyping + typingUserId on conversation in cache
                                  3. Start 3-second auto-clear timer
                                  4. New typing event resets the timer

  type: "message_read"    ──►     1. Set readByOthers: true on matching messages in cache
                                  2. Set unreadCount: 0 on conversation (reader caught up)

membership
  type: "join"            ──►     1. Upsert conversation into conversations.list
                                  2. Re-sort by lastMessage time

  type: "leave"           ──►     1. Remove conversation from conversations.list

presence                  ──►     1. Invalidate users.profile / users.presence queries
                                  (triggers refetch, not a direct cache write)
```

### Reconnection

When the SSE connection drops, it retries with exponential backoff (2s base, 1.5x multiplier, 30s cap). After 10 failed retries, it stops and dispatches a `newchat:sse-disconnected` CustomEvent. The `OfflineBanner` component listens for this and shows a red bar with a "Reconnect" button that dispatches `newchat:sse-reconnect` (resets retry counter).

When the SSE connection successfully reconnects:
1. Invalidate `conversations.list` (may have missed membership changes)
2. Invalidate `messages.list` for the active conversation (may have missed messages)
3. Both queries refetch in the background — UI shows stale data until fresh data arrives
4. Dispatch `newchat:sse-reconnected` CustomEvent (hides offline banner)

## Optimistic Updates

Message sending uses an optimistic update strategy that gives zero-latency perceived sends.

### The Problem

Without optimistic updates, the user sends a message and sees nothing until the server responds. With SSE, the message actually arrives twice — once from the mutation response and once from the SSE event. This creates duplication and perceived lag.

### The Solution

A module-level `Map` (outside React) tracks pending messages:

```
User hits send
      │
      ▼
  ┌─────────────────────────────────────┐
  │ 1. Register in optimistic Map       │
  │    { optimisticId, negativeId: -1,  │
  │      conversationId, content }      │
  │                                     │
  │ 2. Insert into React Query cache    │
  │    with negative temp ID            │
  │    + _status: "pending"             │
  │    (message appears instantly)      │
  └─────────────────────┬───────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────┐
  │ 3. Call trpc.messages.send          │
  │    (runs in background)             │
  └─────────────────────┬───────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────┐
  │ 4. SSE delivers "new_message"       │
  │                                     │
  │ 5. findAndRemoveOptimistic()        │
  │    matches by content+conversationId│
  │                                     │
  │ 6. Swap negativeId → real ID        │
  │    in the same cache position       │
  │    (no visual flicker)              │
  └─────────────────────────────────────┘
```

Safety nets:
- **Stale cleanup**: Entries older than 30 seconds are auto-removed from the Map
- **Failure handling**: On mutation error, remove from Map and show error toast
- **Content matching**: Uses content + conversationId for matching — handles concurrent sends correctly

Why a module-level Map instead of React state:
- SSE event handlers and tRPC mutation callbacks both need access
- Avoids stale closure issues in event listeners
- No re-renders on Map changes (it's bookkeeping, not UI state)

## Routing & Navigation

### Route Structure

```
/                   Landing page (public, static)
/auth               Telegram login flow (public)
/onboarding         Profile setup (protected, first-time only)
/chat               Main app (protected)
```

### Route Protection

`AuthGuard` wraps all page content and checks auth status:

| Auth Status | Current Route | Action |
|---|---|---|
| `loading` | any | Show "Checking your session..." |
| `unauthenticated` | `/chat`, `/onboarding` | Redirect to `/auth?next={path}` |
| `authenticated` | `/auth` | Redirect to `?next` param or `/onboarding` |
| `authenticated` | any other | Render normally |

### Navigation Flow

```
/auth ─── login success ──► /onboarding ─── profile saved ──► /chat
  ▲                                                              │
  └──────────── token expired or logout ─────────────────────────┘
```

Within `/chat`, the selected conversation is a query parameter:
- Click conversation → `router.replace("/chat?conversationId=123")`
- The `ChatPanel` component keys on `conversationId` — changing it unmounts/remounts the panel, which resets scroll position, typing state, and triggers a fresh message query

### Responsive Layout

```
Desktop (md+)                    Mobile (<md)
┌──────────┬─────────────────┐   ┌─────────────────┐
│ Sidebar  │   ChatPanel     │   │   ChatPanel      │
│ (always  │   (selected     │   │   (full width)   │
│  visible)│    conversation)│   │                   │
│          │                 │   │   [☰ opens drawer │
│          │                 │   │    with sidebar]  │
└──────────┴─────────────────┘   └───────────────────┘
```

Mobile uses a drawer (`@base-ui/react`) that slides the sidebar in from the left. The drawer closes when a conversation is selected.

## Performance Patterns

### Message List Virtualization

The message list uses `react-virtualized` with `CellMeasurer` for dynamic row heights (messages vary in length and may have attachments). Key decisions:

- **Cache key**: Uses message ID (not index) so measurements survive prepends
- **Scroll anchor**: When new messages arrive, scroll stays at the bottom if the user hasn't scrolled up
- **Fetch trigger**: `fetchNextPage()` fires when scroll position is within 200px of the top (loads older messages)

### Batched Operations

| Operation | Batching Strategy |
|---|---|
| Read receipts | IntersectionObserver collects visible message IDs, debounced 300ms, then single `markRead` call (max 100 IDs) |
| Typing indicators | Throttled to 1 notification per 2 seconds from the client side |
| SSE reconnect refetch | Single invalidation of conversations.list + messages.list, not per-conversation |

### What's Intentionally Not Optimized

- **Conversation list**: Not virtualized — chat apps rarely have thousands of conversations. Simple `.map()` is fine.
- **User search**: No client-side caching of search results beyond React Query's 60-second staleTime. Search is fast enough server-side.
- **File uploads**: Uses `Promise.allSettled` for partial failure tolerance. Upload state lives in a module-level store (`lib/upload-store.ts`) keyed by conversationId, so uploads survive conversation switches. Each batch gets an `AbortController` for cancellation. Individual XHR uploads have a 60-second timeout.

## Key Files

| File | What to read it for |
|---|---|
| `app/layout.tsx` | Provider tree, dark mode script |
| `app/chat/page.tsx` | Main layout, responsive sidebar, conversation selection |
| `app/auth/page.tsx` | Token creation → polling → exchange → redirect |
| `lib/providers/auth-context.tsx` | Auth state machine, hydration, token management |
| `lib/providers/trpc-provider.tsx` | tRPC client config, React Query staleTime, auth headers |
| `lib/hooks/use-sse.ts` | SSE connection lifecycle, reconnection, event routing |
| `lib/sse-cache-updaters.ts` | React Query cache update handlers for SSE events |
| `lib/optimistic-messages.ts` | Module-level Map for pending message tracking |
| `lib/auth-storage.ts` | In-memory token cache with pub/sub for subscribers |
| `lib/upload.ts` | Presigned URL fetch + R2 PUT with progress tracking + AbortSignal |
| `lib/upload-store.ts` | Module-level upload state per conversation (cross-conversation persistence) |
| `lib/safe-local-storage.ts` | Try/catch localStorage wrapper with in-memory fallback |
| `components/ui/feature-boundary.tsx` | React error boundary with console logging |
| `components/ui/offline-banner.tsx` | SSE disconnected banner with manual reconnect |
| `components/auth-guard.tsx` | Route protection logic |
| `components/chat/chat-panel/hooks/useVirtualizedMessages.ts` | Infinite query + scroll virtualization |
| `components/chat/chat-panel/hooks/useMarkReadOnVisible.ts` | IntersectionObserver → batched markRead |
| `components/chat/message-input/hooks/useFileAttachments.ts` | File state management + upload coordination |
