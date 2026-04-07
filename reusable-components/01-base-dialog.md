# BaseDialog — Shared Dialog Wrapper

## Problem

Every dialog in the app repeats the same `Dialog.Root > Portal > Backdrop > Viewport > ScrollArea > Popup` boilerplate with nearly identical classNames. The header (Description + Title + Close button) is also duplicated across all 5 dialogs. Minor inconsistencies have crept in: different z-indices, backdrop opacity (`bg-black/40` vs `bg-black/30`), shadow levels (`shadow-xl` vs `shadow-2xl`), and missing `Dialog.Description` in some dialogs.

## Current Instances (5 dialogs)

### new-chat-dialog.tsx
`apps/web/src/components/chat/new-chat-dialog.tsx` (lines 89-202)
```tsx
<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
<Dialog.Viewport className="fixed inset-0 z-60 flex items-center justify-center px-4">
  <Dialog.Popup
    render={<form onSubmit={handleSubmit} />}
    className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
```

### group-settings-dialog.tsx
`apps/web/src/components/chat/group-settings-dialog.tsx` (lines 141-283)
```tsx
<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
<Dialog.Viewport className="fixed inset-0 z-60 flex items-center justify-center px-4">
  <Dialog.Popup className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
```

### edit-profile-dialog/index.tsx
`apps/web/src/components/users/edit-profile-dialog/index.tsx` (lines 26-87)
```tsx
<Dialog.Backdrop className="fixed inset-0 bg-black/30" />
<Dialog.Viewport className="fixed inset-0 flex items-center justify-center px-4">
  <ScrollArea.Root ...>
    <ScrollArea.Viewport ...>
      <ScrollArea.Content ...>
        <Dialog.Popup className="w-full min-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
```

### settings-dialog/index.tsx
`apps/web/src/components/users/settings-dialog/index.tsx` (lines 28-90)
```tsx
<Dialog.Backdrop className="fixed inset-0 bg-black/30" />
<Dialog.Viewport className="fixed inset-0 flex items-center justify-center px-4">
  <ScrollArea.Root ...>
    <ScrollArea.Viewport ...>
      <ScrollArea.Content ...>
        <Dialog.Popup className="w-full max-w-lg min-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
```

### profile-dialog.tsx
`apps/web/src/components/users/profile-dialog.tsx` (lines 47-137)
```tsx
<Dialog.Backdrop className="fixed inset-0 z-60 bg-black/30" />
<Dialog.Viewport className="fixed inset-0 z-70 flex items-center justify-center px-4 py-8">
  <Dialog.Popup className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
```

### Dialog header (repeated in all 5)
```tsx
<div className="flex items-start justify-between">
  <div>
    <Dialog.Description className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
      {subtitle}
    </Dialog.Description>
    <Dialog.Title className="text-xl font-bold text-slate-900 dark:text-slate-100">
      {title}
    </Dialog.Title>
  </div>
  <Dialog.Close className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
    Close
  </Dialog.Close>
</div>
```
Note: `edit-profile-dialog` and `settings-dialog` currently use a `<p>` tag instead of `Dialog.Description` for the subtitle — these should be normalized to `Dialog.Description` during the refactor.

## Differences Between Instances

| Property | new-chat | group-settings | edit-profile | settings | profile |
|---|---|---|---|---|---|
| Backdrop z-index | `z-50` | `z-50` | _(none)_ | _(none)_ | `z-60` |
| Backdrop opacity | `bg-black/40` | `bg-black/40` | `bg-black/30` | `bg-black/30` | `bg-black/30` |
| Popup width | `max-w-md` | `max-w-md` | `min-w-md` | `max-w-lg min-w-lg` | `max-w-lg` |
| Shadow | `shadow-xl` | `shadow-xl` | `shadow-2xl` | `shadow-2xl` | `shadow-2xl` |
| Title font size | `text-xl` | `text-xl` | `text-2xl` | `text-xl` | `text-2xl` |
| ScrollArea | no | no | yes | yes | no |
| Header alignment | `items-center` | `items-center` | `items-start` | `items-start` | `items-start` |
| Subtitle element | `Dialog.Description` | `Dialog.Description` | `<p>` tag | `<p>` tag | `Dialog.Description` |

## Proposed Solution

Create a `BaseDialog` component in `apps/web/src/components/ui/base-dialog.tsx` that standardizes the wrapper structure and exposes a `size` prop for the popup width.

### Suggested API
```tsx
<BaseDialog
  open={open}
  onOpenChange={onOpenChange}
  title="New conversation"
  subtitle="Start a chat"   // optional — renders Dialog.Description when provided
  size="md"  // "md" | "lg" | "xl"
>
  {/* dialog body content */}
</BaseDialog>
```

### Design Decisions
- Standardize backdrop to `z-50 bg-black/40` (per `docs/design-system.md` line 366)
- Standardize shadow to `shadow-xl` (per `docs/design-system.md` line 189)
- `size` controls `max-w-*`: `md` (448px), `lg` (512px), `xl` (576px)
- Title always `text-xl font-bold` (per `docs/design-system.md` line 117)
- Close button is always rendered with the standard text style
- Header always uses `items-start` for consistent alignment
- `subtitle` is optional — when provided, renders as `Dialog.Description`; dialogs currently using a `<p>` tag should be migrated to `Dialog.Description`
- Always wrap Popup in `ScrollArea.Root > Viewport > Content` — this is a no-op for short content and ensures tall dialogs scroll correctly on small viewports
- Profile dialog's `z-60`/`z-70` is because it opens on top of other dialogs — handle via an optional `stacked` prop or a z-index prop

## Related Docs
- `docs/design-system.md` lines 363-377 (Dialogs section)
- `docs/frontend-architecture.md` lines 102-172 (Component Organization)

## Estimated Impact
~250 lines of boilerplate eliminated across 5 files.
