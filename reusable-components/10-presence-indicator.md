# PresenceIndicator — Move to Shared UI

## Problem

A `PresenceIndicator` component already exists in `user-result-list.tsx`, and a `MemberAvatar` with a presence dot exists in `group-settings-dialog.tsx`. Both use the same `bg-emerald-500` / `bg-slate-400` pattern but are defined locally in their respective files. Neither is importable from a shared location.

## Current Instances

### PresenceIndicator (inline text)
`apps/web/src/components/chat/user-result-list.tsx` (lines 90-108)
```tsx
export function PresenceIndicator({ presence }: { presence?: PresenceSummary }) {
  const isOnline = presence?.status === "online";
  const label = isOnline ? "Online" : presence?.lastSeen ? `Last seen ...` : "Offline";
  return (
    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
      <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-slate-400")} />
      <span>{label}</span>
    </div>
  );
}
```

### MemberAvatar (dot overlay on avatar)
`apps/web/src/components/chat/group-settings-dialog.tsx` (lines 18-42)
```tsx
function MemberAvatar({ user, presence }: { ... }) {
  const isOnline = presence?.status === "online";
  return (
    <div className="relative shrink-0">
      <Avatar avatarUrl={user.avatarUrl} name={user.firstName} size="h-10 w-10" textSize="text-sm" />
      <span className={cn(
        "absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-800",
        isOnline ? "bg-emerald-500" : "bg-slate-400",
      )} />
    </div>
  );
}
```

## Proposed Solution

1. **Move `PresenceIndicator`** from `user-result-list.tsx` to `apps/web/src/components/ui/presence-indicator.tsx` and export it from the barrel file.
2. **Create `PresenceDot`** — a small component for just the colored dot (used by both `PresenceIndicator` and avatar overlays).
3. **Integrate with Avatar** — if the Avatar consolidation from `04-inline-avatar.md` is done, add an optional `presence` prop to `Avatar` that renders the dot overlay, replacing the one-off `MemberAvatar`.

### Suggested API
```tsx
// Inline text indicator (user result list)
<PresenceIndicator presence={user.presence} />

// Dot only (for custom layouts)
<PresenceDot online={isOnline} />

// Avatar with presence (replaces MemberAvatar)
<Avatar avatarUrl={url} name={name} size="h-10 w-10" presence={presence} />
```

## Related Docs
- `docs/design-system.md` lines 45-57 (Status colors: emerald for success/online)
- `docs/presence-and-typing.md` — Presence lifecycle and typing indicators
- `docs/frontend-architecture.md` lines 166-171 (UI components in component tree)

## Estimated Impact
~30 lines consolidated. `PresenceIndicator` becomes importable from a shared location. `MemberAvatar` local component is eliminated.
