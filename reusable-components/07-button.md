# Button — Shared Button Component

## Problem

Primary and secondary button styles are copy-pasted across 5+ locations with inconsistencies in border-radius (`rounded-lg` vs `rounded-full`), padding, and font weight. A `DialogFooter` component exists in `edit-profile-dialog` but uses inline button styles and isn't reused by other dialogs.

## Current Instances

### Primary buttons
**new-chat-dialog.tsx** — line 190
```tsx
<button className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
  Create
</button>
```

**EmptyState.tsx** — line 15
```tsx
<button className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
  Start a new chat
</button>
```

**profile-dialog.tsx** — line 128
```tsx
<button className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50">
  Send message
</button>
```

**DialogFooter.tsx** — lines 16-22
```tsx
<Button type="submit" disabled={isBusy}
  className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50">
  {submitLabel}
</Button>
```

### Secondary (cancel) buttons
**profile-dialog.tsx** — line 116
```tsx
<Dialog.Close className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-400">
  Cancel
</Dialog.Close>
```

**DialogFooter.tsx** — line 13
```tsx
<Dialog.Close className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-400">
  Cancel
</Dialog.Close>
```

## Inconsistencies

| Location | Shape | Padding | Text size |
|---|---|---|---|
| new-chat-dialog (Create) | `rounded-lg` | `px-4 py-2` | default (no text-sm) |
| EmptyState (Start a new chat) | `rounded-full` | `px-4 py-2` | `text-xs` |
| profile-dialog (Send message) | `rounded-full` | `px-6 py-2` | `text-sm` |
| DialogFooter (Submit) | `rounded-full` | `px-6 py-2` | `text-sm` |

## Proposed Solution

Create a `Button` component in `apps/web/src/components/ui/button.tsx` using CVA (already installed for `IconButton`).

### Suggested API
```tsx
<Button variant="primary" size="md" disabled={isPending}>
  Create
</Button>

<Button variant="secondary" size="md">
  Cancel
</Button>

<Button variant="primary" size="sm">
  Start a new chat
</Button>
```

### Variants
- **primary**: `bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50`
- **secondary**: `border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-400`
- **danger**: `text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30`

### Sizes
- **sm**: `px-3 py-1 text-xs`
- **md** (default): `px-4 py-2 text-sm`
- **lg**: `px-6 py-2 text-sm`

All use `rounded-full font-semibold` (standardize on `rounded-full` to match the majority and `IconButton`'s approach).

## Related Docs
- `docs/design-system.md` lines 307-350 (Buttons section)
- `docs/design-system.md` lines 219-223 (Disabled state: `disabled:opacity-50`)
- `docs/design-system.md` lines 168 (Border radius: `rounded-full` for pills and toggle buttons)

## Estimated Impact
~80 lines eliminated. `DialogFooter` can be simplified to use `Button` internally. All future buttons automatically match.
