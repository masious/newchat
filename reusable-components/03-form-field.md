# FormField — Shared Form Field Wrapper

## Problem

The `Field.Root` + `Field.Label` + `Field.Control` + error message combination is repeated 7 times across 4 files with the same structure. Each instance re-implements the same boilerplate. Label styling is mostly consistent but the onboarding form uses a bolder label variant, and one error message is missing its dark mode color pairing.

## Current Instances (7 fields across 4 files)

### new-chat-dialog.tsx (group name)
`apps/web/src/components/chat/new-chat-dialog.tsx` (lines 144-158)
```tsx
<Field.Root className="block text-sm">
  <Field.Label className="text-slate-600 dark:text-slate-400">
    Group name
  </Field.Label>
  <Field.Control render={<input className="mt-1 w-full rounded-lg border ..." />} />
</Field.Root>
```

### new-chat-dialog.tsx (search teammate)
`apps/web/src/components/chat/new-chat-dialog.tsx` (lines 160-180)
```tsx
<Field.Root className="block text-sm">
  <Field.Label className="text-slate-600 dark:text-slate-400">
    Search teammate
  </Field.Label>
  <div className="mt-1">{/* UserSearchCombobox — no Field.Control */}</div>
</Field.Root>
```

### group-settings-dialog.tsx
`apps/web/src/components/chat/group-settings-dialog.tsx` (lines 164-186)
```tsx
<Field.Root className="block text-sm">
  <Field.Label className="text-slate-600 dark:text-slate-400">Group name</Field.Label>
  <Field.Control render={<input className="w-full rounded-lg border ..." />} />
  {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
</Field.Root>
```

### ProfileSection.tsx (display name)
`apps/web/src/components/users/edit-profile-dialog/components/ProfileSection.tsx` (lines 58-73)
```tsx
<Field.Root className="flex flex-col text-sm">
  <Field.Label className="text-slate-600 dark:text-slate-400">Display name</Field.Label>
  <Field.Control render={<input className="mt-1 rounded-lg border ..." />} />
</Field.Root>
```

### ProfileSection.tsx (username)
`apps/web/src/components/users/edit-profile-dialog/components/ProfileSection.tsx` (lines 74-97)
```tsx
<Field.Root className="flex flex-col text-sm" invalid={!!usernameError}>
  <Field.Label className="text-slate-600 dark:text-slate-400">Username</Field.Label>
  <Field.Control render={<input className="mt-1 rounded-lg border ... aria-invalid:border-red-500" />} />
  {usernameError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{usernameError}</p>}
</Field.Root>
```

### ProfileFields.tsx (onboarding — username)
`apps/web/src/app/onboarding/components/ProfileFields.tsx` (lines 20-45)
```tsx
<Field.Root className="flex flex-col">
  <Field.Label className="text-sm font-semibold text-slate-700 dark:text-slate-400">Username</Field.Label>
  <Field.Control render={<input className="mt-1 rounded-lg border ..." />} />
  {usernameError ? (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{usernameError}</p>
  ) : (
    <Field.Description className="mt-1 text-xs text-slate-500 dark:text-slate-400">
      3-32 characters, letters, numbers, and underscores.
    </Field.Description>
  )}
</Field.Root>
```

### ProfileFields.tsx (onboarding — display name)
`apps/web/src/app/onboarding/components/ProfileFields.tsx` (lines 47-66)
```tsx
<Field.Root className="flex flex-col">
  <Field.Label className="text-sm font-semibold text-slate-700 dark:text-slate-400">Display name</Field.Label>
  <Field.Control render={<input className="mt-1 rounded-lg border ..." />} />
  <Field.Description className="mt-1 text-xs text-slate-500 dark:text-slate-400">
    This is what your contacts will see.
  </Field.Description>
</Field.Root>
```

## Shared Elements

- Label class: `text-slate-600 dark:text-slate-400` in dialogs, `text-sm font-semibold text-slate-700 dark:text-slate-400` in onboarding
- Error class: `mt-1 text-xs text-red-600 dark:text-red-400` (except group-settings-dialog which is missing `dark:text-red-400`)
- Field.Root class: always `text-sm` with either `block` or `flex flex-col` (onboarding omits `text-sm` from Root, puts it on Label)
- Input always has `mt-1` spacing from label

## Inconsistencies

| Property | Majority pattern | Deviation |
|---|---|---|
| Label color | `text-slate-600` | ProfileFields uses `text-slate-700` |
| Label weight | _(normal)_ | ProfileFields adds `font-semibold` |
| `text-sm` placement | On `Field.Root` | ProfileFields puts it on `Field.Label` instead |
| Error dark mode | `dark:text-red-400` | group-settings-dialog omits it |
| Description text | — | Only ProfileFields uses `Field.Description` |

## Proposed Solution

Create a `FormField` component in `apps/web/src/components/ui/form-field.tsx` that wraps `Field.Root`, `Field.Label`, and an optional error/description message.

### Suggested API
```tsx
<FormField label="Group name" error={nameError}>
  <TextInput value={name} onChange={...} />
</FormField>

// With invalid state for aria
<FormField label="Username" error={usernameError} invalid={!!usernameError}>
  <TextInput value={username} onChange={...} />
</FormField>

// With description text
<FormField label="Display name" description="This is what your contacts will see.">
  <TextInput value={displayName} onChange={...} />
</FormField>
```

This pairs naturally with the `TextInput` component from `02-text-input.md`. Together they reduce a 10-line block to 3 lines.

### Design Decisions
- Standardize label to `text-slate-600 dark:text-slate-400` (matches dialog convention and design system)
- Standardize error to `mt-1 text-xs text-red-600 dark:text-red-400` (fix group-settings missing dark pairing)
- `description` prop renders `Field.Description` below the control
- When both `error` and `description` are provided, error takes precedence (matches ProfileFields pattern)

## Related Docs
- `docs/design-system.md` lines 407-413 (Form Labels section)
- `docs/design-system.md` lines 415-419 (Error Messages section)
- `docs/design-system.md` lines 352-361 (Inputs section)

## Estimated Impact
~60 lines of boilerplate eliminated across 4 files (7 field instances). Label and error styling inconsistencies resolved.
