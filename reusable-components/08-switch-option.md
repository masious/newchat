# SwitchOption — Shared Toggle Switch with Label

## Problem

In `NotificationSection.tsx`, the Telegram and Browser notification toggles are 98% identical — same `Switch.Root` + `Switch.Thumb` classes, same bordered container, same icon + label + description layout. The ~20-line block is copy-pasted verbatim with only the icon, label, description, and bindings changing.

## Current Instances (2, same file)

### Telegram notification toggle
`apps/web/src/components/users/edit-profile-dialog/components/NotificationSection.tsx` (lines 24-43)
```tsx
<div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
  <Switch.Root
    checked={telegramEnabled}
    onCheckedChange={onTelegramToggle}
    className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-slate-300 transition-colors data-checked:bg-indigo-600 dark:bg-slate-600 data-checked:dark:bg-indigo-600"
  >
    <Switch.Thumb className="pointer-events-none block h-5 w-5 translate-x-0 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-5" />
  </Switch.Root>
  <div>
    <div className="flex items-center gap-2">
      <Send className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Telegram notifications
      </span>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400">
      Receive notifications via the Telegram bot
    </p>
  </div>
</div>
```

### Browser notification toggle
`apps/web/src/components/users/edit-profile-dialog/components/NotificationSection.tsx` (lines 45-65)
Identical structure, different icon (`Bell`), label ("Browser notifications"), and description.

## Proposed Solution

Create a `SwitchOption` component in `apps/web/src/components/ui/switch-option.tsx`.

### Suggested API
```tsx
<SwitchOption
  checked={telegramEnabled}
  onCheckedChange={onTelegramToggle}
  icon={<Send className="h-4 w-4" />}
  label="Telegram notifications"
  description="Receive notifications via the Telegram bot"
/>
```

The component encapsulates the bordered container, Switch.Root/Thumb styling, and icon+label+description layout.

### Notes
- The Switch.Root and Switch.Thumb classNames are long (~150 chars each) and identical between both instances. Centralizing them prevents drift.
- If more toggles are added in the future (e.g., email notifications, sound per-conversation), this component is immediately reusable.

## Related Docs
- `docs/design-system.md` lines 86-87 (Border pairing: `border-slate-200` / `dark:border-slate-700`)
- `docs/design-system.md` lines 83-84 (Primary text: `text-slate-900` / `dark:text-slate-100`)
- `docs/frontend-architecture.md` lines 159-161 (NotificationSection in component tree)

## Estimated Impact
~30 lines of duplication eliminated in NotificationSection. Prevents future drift if more toggle options are added.
