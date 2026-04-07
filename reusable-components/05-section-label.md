# SectionLabel — Shared Section Header Label

## Problem

The uppercase section label pattern (`text-xs font-semibold uppercase text-slate-500 dark:text-slate-400`) appears 7 times across the codebase, rendered as different elements (`Dialog.Description`, `legend`, `h3`, `Collapsible.Trigger`). The styling is 98% identical but uses different semantic elements. A shared class or component would make this consistent and easy to update globally.

## Current Instances (7)

### As Dialog.Description
**new-chat-dialog.tsx** — line 105
```tsx
<Dialog.Description className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
  Start a chat
</Dialog.Description>
```

**group-settings-dialog.tsx** — line 150
```tsx
<Dialog.Description className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
  Group settings
</Dialog.Description>
```

**profile-dialog.tsx** — line 60
```tsx
<Dialog.Description className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
  User Profile
</Dialog.Description>
```

### As legend (fieldset)
**NotificationSection.tsx** — line 17
```tsx
<legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
  Notifications
</legend>
```

**SettingsSection.tsx** — line 16
```tsx
<legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
  Appearance
</legend>
```

### As h3
**group-settings-dialog.tsx** — line 191
```tsx
<h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
  Members
</h3>
```

### As Collapsible.Trigger
**user-result-list.tsx** — line 24
```tsx
<Collapsible.Trigger className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
  People
</Collapsible.Trigger>
```

### Not included: edit-profile-dialog
`apps/web/src/components/users/edit-profile-dialog/index.tsx` does **not** use this pattern. Its subtitle is a `<p>` with `text-sm text-slate-500 dark:text-slate-400` — different styling (`text-sm`, no `font-semibold`, no `uppercase`), so it's not a SectionLabel candidate.

## Inconsistency

The `legend` elements in `NotificationSection` and `SettingsSection` use reversed color order (`text-slate-400 dark:text-slate-500`) and add `tracking-wide`, while all other instances use `text-slate-500 dark:text-slate-400` without `tracking-wide`. This should be standardized.

## Proposed Solution

Create a `SectionLabel` component in `apps/web/src/components/ui/section-label.tsx`. Since the pattern is used with different semantic elements, the component should accept an `as` prop.

### Suggested API
```tsx
<SectionLabel>Members</SectionLabel>
<SectionLabel as="legend">Notifications</SectionLabel>
<SectionLabel as={Dialog.Description}>Group settings</SectionLabel>
```

### Standard Style
```tsx
className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400"
```

Standardize on `text-slate-500 dark:text-slate-400` (without `tracking-wide`) to match the majority of instances and the design system convention for secondary text.

## Related Docs
- `docs/design-system.md` lines 35-36 (Secondary text pairing: `text-slate-500` / `dark:text-slate-400`)
- `docs/design-system.md` lines 121 (text-xs usage: "Timestamps, secondary info, subtitles, status text")

## Estimated Impact
~7 className strings replaced, color inconsistency between `legend` elements and other labels resolved.
