# Frontend Robustness

**Priority:** Medium
**Status:** Todo

## Items

### 1. Error Boundaries — `apps/web/src/components/chat/chat-panel/index.tsx`

No error boundaries in the web app. If a rendering error occurs in the chat panel or message list, the entire app crashes with a white screen.

**Fix:** Wrap key sections (chat panel, sidebar, message input) in React error boundaries with retry/fallback UI.

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

`Promise.all()` uploads with no `AbortController`. Uploads continue in background after unmount.

**Fix:** Create an `AbortController` per upload batch, pass signal to fetch calls, abort on unmount.
