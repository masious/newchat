# Frontend Robustness

**Priority:** Medium
**Status:** Done

## Items

### 1. Error Boundaries

No granular error boundaries in the web app. Next.js file-based `error.tsx` and `global-error.tsx` exist but are very coarse — a crash in any child takes down the entire page.

**Fix:** Create a reusable `<FeatureBoundary fallback={...}>` component and wrap:

- `ChatPanel` — virtualized list complexity makes this the most crash-prone section
- `ConversationSidebar` — crash here blacks out navigation
- `MessageInput` — crash here locks user out of sending messages
- `RealtimeProvider` — SSE processing errors could crash the entire provider tree
- Individual message rendering inside the virtualized list — one malformed message shouldn't break the chat
- Dialog components (`NewChatDialog`, `ProfileDialog`, `GroupDetailsDialog`) — modal crash shouldn't nuke the page

### 2. Auth Page Double-Mutation Guard — `apps/web/src/app/auth/page.tsx:53-55`

`createToken.mutate()` is called in `useEffect` without checking if already in progress. React Strict Mode remounts trigger it twice.

**Fix:** Add a ref guard:

```typescript
const initiated = useRef(false);
useEffect(() => {
  if (initiated.current) return;
  initiated.current = true;
  createToken.mutate();
}, []);
```

### 3. Upload Cancellation — `apps/web/src/components/chat/message-input/hooks/useFileAttachments.ts:28-44`

`Promise.all()` uploads with no `AbortController`. Uploads continue in background after unmount. Because `ChatPanel` is keyed by `selectedConversation.id`, switching conversations fully unmounts `MessageInput` and its `useFileAttachments` hook — so uploads are silently orphaned.

**Fix:** Lift upload state above `ChatPanel` to `ChatPage` level so it survives conversation switches. Track pending uploads keyed by `conversationId`. Add an `AbortController` per upload batch with signal passed to XHR calls, but only abort when the user explicitly cancels — not on conversation switch. Re-associate completed uploads when the user navigates back to the originating conversation.

### 4. XHR Upload Timeout — `apps/web/src/lib/upload.ts:83-101`

`uploadFileWithProgress` wraps an XHR in a Promise with no timeout. If the PUT to R2 hangs, the promise never resolves — the user sees a spinner forever.

**Fix:** Add a `setTimeout` (e.g. 60s) that calls `xhr.abort()` and rejects the promise with a timeout error.

### 5. localStorage Without Try/Catch

`localStorage.getItem`/`setItem` can throw synchronously (private browsing, quota exceeded, disabled storage). Unguarded access at app boot crashes the entire app.

**Affected files:**
- `apps/web/src/lib/auth-storage.ts`
- `apps/web/src/lib/hooks/use-dark-mode.ts`
- `apps/web/src/lib/hooks/use-notification-sound.ts`

**Fix:** Create a `safeLocalStorage` utility that wraps `getItem`/`setItem`/`removeItem` in try/catch, falling back to in-memory storage. Replace all direct `window.localStorage` calls with it.

### 6. Undefined `selectedConversation` Guard — `apps/web/src/app/chat/page.tsx:38-45`

`selectedConversation` falls back to `conversations[0]` which is `undefined` when the list is empty. It's then passed to `getConversationName()` without a null check.

**Fix:** Guard against `undefined` before passing to `getConversationName()` and other props that assume a defined conversation.

### 7. Auth Token Exchange Error Handling — `apps/web/src/app/auth/page.tsx:~70`

If `exchangeToken.mutateAsync()` fails after the poll confirms the token, the catch block only logs — the user is stuck on the auth page with no feedback.

**Fix:** Show an error state with a retry action when the exchange fails.

### 8. Failed Message Retry UX — `apps/web/src/components/chat/message-input/index.tsx:164-186`

Optimistic rollback marks a failed message's status as `"failed"` but never removes it or offers a retry action. The user sees a stuck failed message indefinitely.

**Fix:** Add a "Retry" button on failed `MessageBubble` items that re-triggers the send mutation, and a "Discard" action to remove the message.

### 9. Event Listener Churn — `apps/web/src/lib/hooks/use-notification-sound.ts:31-35`

`play` is in the `useEffect` dependency array. Every muted/unmuted toggle recreates the `play` reference, causing the event listener to unsubscribe and re-subscribe.

**Fix:** Stabilize `play` with `useCallback` and stable dependencies, or use a ref to hold the latest `play` and reference it from a stable listener.

### 10. SSE Infinite Retry — `apps/web/src/lib/hooks/use-sse.ts`

Reconnection has exponential backoff but no maximum attempt limit — it will retry forever if the server is permanently unreachable.

**Fix:** Cap retries (e.g. 10 attempts). After exhausting retries, stop reconnecting and show an "offline" banner with a manual retry button.

### 11. Blob URL Leak — `apps/web/src/lib/upload.ts:8-27`

`getImageDimensions()` creates an object URL and revokes it in `onload`/`onerror`. If neither fires (e.g. corrupt file), the URL is never revoked — memory leak.

**Fix:** Add a timeout safety net (e.g. 5s) that calls `URL.revokeObjectURL(url)` and resolves `null`.

### 12. Global Network Error Feedback — `apps/web/src/lib/providers/trpc-provider.tsx`

tRPC client has a Sentry error link but no user-facing feedback for network failures. Failed queries and mutations fail silently from the user's perspective.

**Fix:** Configure React Query's `MutationCache` with a global `onError` callback that shows a toast for unhandled mutation errors (network failures, 5xx responses). Optionally add a similar handler on `QueryCache` for critical queries.
