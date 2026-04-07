# ErrorMessage — Shared Error Display

## Problem

Conditional error messages with the same styling (`mt-1 text-xs text-red-600 dark:text-red-400`) appear 8+ times across the codebase. Some instances omit the dark mode pair (`dark:text-red-400`), and the text size varies between `text-xs` and `text-sm` inconsistently.

## Current Instances (8+)

### text-xs pattern (correct per design-system.md)
**ProfileSection.tsx** — lines 92-95
```tsx
{usernameError && (
  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{usernameError}</p>
)}
```

**ProfileFields.tsx** — lines 36-39
```tsx
{usernameError ? (
  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{usernameError}</p>
) : ( ... )}
```

**group-settings-dialog.tsx** — lines 183-185
```tsx
{nameError && (
  <p className="mt-1 text-xs text-red-600">{nameError}</p>
)}
```
Note: **missing `dark:text-red-400`**

### text-sm pattern (inconsistent)
**new-chat-dialog.tsx** — line 186
```tsx
{error && <p className="text-sm text-red-600">{error}</p>}
```
Note: **missing `dark:text-red-400`**, uses `text-sm` instead of `text-xs`, no `mt-1`

**profile-dialog.tsx** — lines 83-85
```tsx
<p className="mt-6 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
```
Note: uses `text-sm` and `mt-6` (standalone error, not under a field)

**user-result-list.tsx** — line 34
```tsx
<p className="mt-2 text-sm text-red-600">{error}</p>
```
Note: **missing `dark:text-red-400`**

### Alert box pattern (edit-profile-dialog)
**edit-profile-dialog/index.tsx** — lines 70-74
```tsx
<div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
  {form.error}
</div>
```
This is a different variant — a box-style error alert vs inline text.

## Inconsistencies

| Location | Size | Dark mode | Margin |
|---|---|---|---|
| ProfileSection | `text-xs` | `dark:text-red-400` | `mt-1` |
| ProfileFields | `text-xs` | `dark:text-red-400` | `mt-1` |
| group-settings-dialog | `text-xs` | **missing** | `mt-1` |
| new-chat-dialog | `text-sm` | **missing** | none |
| profile-dialog | `text-sm` | `dark:text-red-400` | `mt-6` |
| user-result-list | `text-sm` | **missing** | `mt-2` |

## Proposed Solution

Create an `ErrorMessage` component in `apps/web/src/components/ui/error-message.tsx`.

### Suggested API
```tsx
// Inline field error (default)
<ErrorMessage>{nameError}</ErrorMessage>

// With className override for spacing
<ErrorMessage className="mt-6">{errorMessage}</ErrorMessage>
```

The component renders nothing when children is falsy (handles the `{error && ...}` pattern internally).

### Standard Style
```tsx
className="mt-1 text-xs text-red-600 dark:text-red-400"
```

This also pairs naturally with `FormField` from `03-form-field.md` — `FormField` can use `ErrorMessage` internally, so field-level errors are handled automatically.

## Related Docs
- `docs/design-system.md` lines 415-419 (Error Messages section)
- `docs/design-system.md` lines 50-51 (Error text color: `text-red-600` / `dark:text-red-400`)

## Estimated Impact
~8 error patterns consolidated. 3 instances gain missing `dark:text-red-400` pairing.
