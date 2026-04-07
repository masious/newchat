# EmptyState — Shared Empty State Component

## Problem

Three components render empty states with the same structure: a large icon + heading + description + optional action button. The layout, icon sizing, text colors, and spacing are nearly identical.

## Current Instances (3)

### Sidebar EmptyState
`apps/web/src/components/chat/conversation-sidebar/components/EmptyState.tsx` (lines 1-21)
```tsx
<div className="flex flex-col items-center justify-center px-6 py-12 text-center">
  <MessageCircle className="h-12 w-12 text-slate-300 dark:text-slate-600" strokeWidth={1} />
  <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No conversations yet</p>
  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Search for people above or start a new chat.</p>
  <button className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
    Start a new chat
  </button>
</div>
```

### EmptyMessages
`apps/web/src/components/chat/chat-panel/components/EmptyMessages.tsx` (lines 1-11)
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Mail className="h-12 w-12 text-slate-300 dark:text-slate-600" strokeWidth={1} />
  <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No messages yet</p>
  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Send the first message to start the conversation.</p>
</div>
```

### UserResultList (no results)
`apps/web/src/components/chat/user-result-list.tsx` (lines 36-44)
```tsx
<div className="flex flex-col items-center py-4 text-center">
  <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
  <p className="mt-2 text-sm text-slate-500">No people found for &ldquo;{filter}&rdquo;</p>
  <p className="mt-1 text-xs text-slate-400">Try a different name or username.</p>
</div>
```

## Shared Elements

| Element | EmptyState | EmptyMessages | UserResultList |
|---|---|---|---|
| Container | `flex flex-col items-center justify-center text-center` | same | same (no `justify-center`) |
| Icon size | `h-12 w-12` | `h-12 w-12` | `h-8 w-8` |
| Icon color | `text-slate-300 dark:text-slate-600` | same | same |
| Heading | `mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300` | same | `mt-2 text-sm text-slate-500` (different) |
| Description | `mt-1 text-xs text-slate-500 dark:text-slate-400` | same | `mt-1 text-xs text-slate-400` |
| Action | Primary button | _(none)_ | _(none)_ |

## Proposed Solution

Create an `EmptyState` component in `apps/web/src/components/ui/empty-state.tsx`.

### Suggested API
```tsx
<EmptyState
  icon={<MessageCircle className="h-12 w-12" strokeWidth={1} />}
  heading="No conversations yet"
  description="Search for people above or start a new chat."
  action={
    <Button variant="primary" size="sm" onClick={onOpenNewChat}>
      Start a new chat
    </Button>
  }
/>
```

The component handles the centered layout, icon color (`text-slate-300 dark:text-slate-600`), heading/description typography, and optional action slot.

## Related Docs
- `docs/design-system.md` lines 34-36 (Primary/secondary text colors)
- `docs/frontend-architecture.md` lines 118-119 (EmptyMessages, EmptyState in component tree)

## Estimated Impact
~40 lines consolidated. Ensures future empty states automatically match the existing visual pattern.
