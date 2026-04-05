# Design System Consistency

**Priority:** Medium
**Status:** Done
**Reference:** [docs/design-system.md](../docs/design-system.md)

Audit found ~7 categories of inconsistency between existing components and the design system doc. Each item below lists the deviation, the canonical pattern from the doc, and every file that needs updating.

---

## 1. Input Background Colors in Dark Mode

**Standard:** `dark:bg-slate-700` for all inputs and textareas.

| File | Line | Current | Fix |
|------|------|---------|-----|
| `apps/web/src/components/chat/message-input/components/MessageTextarea.tsx` | 24 | `dark:bg-slate-800` | → `dark:bg-slate-700` |
| `apps/web/src/components/chat/message-input/index.tsx` | 192 | `dark:bg-slate-800` (form container) | → `dark:bg-slate-700` |
| `apps/web/src/components/chat/conversation-sidebar/components/SearchInput.tsx` | 15 | `dark:bg-slate-900` | → `dark:bg-slate-700` |

**Why:** The doc specifies `dark:bg-slate-700` for input backgrounds. `slate-900` is reserved for page backgrounds, `slate-800` for elevated surfaces (dialogs, popovers). Inputs sit inside those surfaces and should use `slate-700`.

---

## 2. Input Border Colors in Dark Mode

**Standard:** `dark:border-slate-600` for inputs, `dark:border-slate-700` for structural/container borders.

| File | Line | Current | Fix |
|------|------|---------|-----|
| `apps/web/src/components/chat/conversation-sidebar/components/SearchInput.tsx` | 15 | `dark:border-slate-700` | → `dark:border-slate-600` |

**Why:** SearchInput is a text input but uses the structural border shade. All other inputs consistently use `dark:border-slate-600`.

---

## 3. Font Weight — `font-medium` → `font-semibold`

**Standard:** `font-semibold` is the only bold weight. `font-medium` is not in the design system.

| File | Line | Current | Fix |
|------|------|---------|-----|
| `apps/web/src/app/error.tsx` | 19 | `font-medium` | → `font-semibold` |
| `apps/web/src/app/onboarding/page.tsx` | 105 | `font-medium` (form label) | → `font-semibold` |
| `apps/web/src/app/onboarding/page.tsx` | 126 | `font-medium` (form label) | → `font-semibold` |
| `apps/web/src/app/onboarding/page.tsx` | 149 | `font-medium` (label) | → `font-semibold` |
| `apps/web/src/app/onboarding/page.tsx` | 177 | `font-medium` (setting label) | → `font-semibold` |
| `apps/web/src/app/onboarding/page.tsx` | 196 | `font-medium` (link text) | → `font-semibold` |

**Why:** Two weights for the same purpose (labels) creates visual inconsistency. `font-semibold` is the dominant pattern everywhere else.

---

## 4. Primary Button Hover — Opacity vs Color Shift

**Standard:** `hover:bg-indigo-500` for primary button hover state.

| File | Line | Current | Fix |
|------|------|---------|-----|
| `apps/web/src/components/chat/message-input/index.tsx` | 219 | `hover:opacity-80` | → `hover:bg-indigo-500` |

**Why:** Every other primary button uses `hover:bg-indigo-500`. The send button should match. Opacity-based hover is reserved for `active:opacity-80` (pressed state).

---

## 5. `rounded-xl` → `rounded-2xl` or `rounded-lg`

**Standard:** The border radius scale is `rounded-full` > `rounded-2xl` > `rounded-lg` > `rounded-md`. No `rounded-xl`.

Audit each occurrence and decide based on context — large prominent elements (cards, dialogs) → `rounded-2xl`, standard elements (buttons, inputs, containers) → `rounded-lg`:

| File | Line | Current | Likely Fix |
|------|------|---------|------------|
| `apps/web/src/components/users/profile-dialog.tsx` | (search for `rounded-xl`) | `rounded-xl` | → `rounded-2xl` (dialog section) or `rounded-lg` (smaller element) |
| `apps/web/src/app/onboarding/page.tsx` | (search for `rounded-xl`) | `rounded-xl` | → `rounded-2xl` (card) or `rounded-lg` (container) |

**Note:** Line numbers may shift. Search for `rounded-xl` in the web app and evaluate each usage. There are ~12 occurrences. For each one:
- If it's a card, panel, or large visual container → `rounded-2xl`
- If it's a button, input, or smaller element → `rounded-lg`

---

## 6. Secondary Text Color Hierarchy

**Standard (from design-system.md):**
- `dark:text-slate-400` — secondary text (descriptions, labels, hints)
- `dark:text-slate-500` — placeholder text only

`dark:text-slate-300` is not in the standard pairings. Audit and normalize:

| File | Context | Current | Fix |
|------|---------|---------|-----|
| `apps/web/src/components/chat/new-chat-dialog.tsx` | ~line 96 | `dark:text-slate-300` | Evaluate: if secondary text → `dark:text-slate-400` |
| Other occurrences of `dark:text-slate-300` | Various | `dark:text-slate-300` | Evaluate each — some may be intentional for lighter interactive text |

**Note:** Search for `dark:text-slate-300` across the web app (~15 occurrences). For each:
- If it's a button/interactive label → keep or change to `dark:text-slate-200` (which pairs with primary text)
- If it's a description/secondary text → `dark:text-slate-400`

---

## 7. Hover State on List Items — `hover:bg-slate-50` vs `hover:bg-slate-100`

**Standard (from design-system.md):**
- `hover:bg-slate-50 dark:hover:bg-slate-700` — list items on white background
- `hover:bg-slate-100 dark:hover:bg-slate-700` — icon buttons

Audit `hover:bg-slate-100` on list-item-like elements (not icon buttons) and normalize to `hover:bg-slate-50`.

---

## Execution Plan

1. Search for each pattern listed above (the "Current" column) across `apps/web/src/`
2. Verify the line numbers are still accurate (they may have shifted since the audit)
3. Apply the fix for each occurrence
4. Visually verify dark mode and light mode after changes — run `bun dev` and check:
   - Onboarding page (font weights, rounded corners)
   - Chat sidebar (search input background/border)
   - Message input area (textarea background, send button hover)
   - Profile dialog (rounded corners, text colors)
   - New chat dialog (text colors)
5. No functional changes — all fixes are class name replacements only
