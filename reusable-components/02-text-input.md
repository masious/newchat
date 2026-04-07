# TextInput — Shared Input Component

## Problem

The same text input className string (~140 characters) is copy-pasted in 7+ locations across the codebase. Minor inconsistencies exist: some use `border-slate-200`, others `border-slate-300`; some include `text-sm`, others don't; some include a dark placeholder style, others omit it.

## Current Instances (7 inputs)

### group-settings-dialog.tsx
`apps/web/src/components/chat/group-settings-dialog.tsx` (line 171)
```tsx
className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
```

### new-chat-dialog.tsx
`apps/web/src/components/chat/new-chat-dialog.tsx` (line 150)
```tsx
className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
```

### ProfileSection.tsx (display name)
`apps/web/src/components/users/edit-profile-dialog/components/ProfileSection.tsx` (line 69)
```tsx
className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
```

### ProfileSection.tsx (username)
`apps/web/src/components/users/edit-profile-dialog/components/ProfileSection.tsx` (line 88)
```tsx
className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 aria-invalid:border-red-500"
```

### ProfileFields.tsx (onboarding — username)
`apps/web/src/app/onboarding/components/ProfileFields.tsx` (line 31)
```tsx
className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
```

### ProfileFields.tsx (onboarding — display name)
`apps/web/src/app/onboarding/components/ProfileFields.tsx` (line 58)
```tsx
className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
```

### SearchInput.tsx
`apps/web/src/components/chat/conversation-sidebar/components/SearchInput.tsx` (line 15)
```tsx
className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
```

### Not included: user-search-combobox.tsx
`apps/web/src/components/chat/user-search-combobox.tsx` uses a `Combobox.InputGroup` wrapper with its own border and a nested `Combobox.Input` with `border-0`. This is structurally different (compound component) and not a candidate for `TextInput`.

## Inconsistencies

| Property | Canonical (design-system.md) | Actual deviations |
|---|---|---|
| Border color | `border-slate-200` | ProfileSection & ProfileFields use `border-slate-300` |
| Text size | `text-sm` | Only group-settings and SearchInput include it |
| Text color | _(inherited)_ | ProfileFields adds explicit `text-slate-900` |
| Placeholder | `dark:placeholder:text-slate-500` | Only SearchInput includes it (as `dark:placeholder-slate-500`) |
| Width | `w-full` | ProfileSection & ProfileFields omit it |
| Validation | — | ProfileSection username adds `aria-invalid:border-red-500` |

## Proposed Solution

Create a `TextInput` component in `apps/web/src/components/ui/text-input.tsx` that renders a styled `<input>` element with all standard classes built in.

### Suggested API
```tsx
<TextInput
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Enter group name…"
  className="mt-1"  // for spacing overrides
/>
```

The component forwards all standard `<input>` props (via `React.ComponentProps<"input">`) and uses `cn()` to merge in a `className` override.

### Canonical Style (from design-system.md)
```tsx
className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
```

## Related Docs
- `docs/design-system.md` lines 352-361 (Inputs section)
- `docs/design-system.md` lines 209-215 (Focus pattern)
- `docs/design-system.md` lines 86-87 (Input border pairing)

## Estimated Impact
~7 className strings replaced, inconsistencies between `border-slate-200`/`border-slate-300` and missing `text-sm`/placeholder styles resolved.
