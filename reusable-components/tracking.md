# Reusable Components — Tracking

Extracted UI patterns that should be consolidated into shared components. Each item links to a detailed issue file with code references, inconsistencies, and a proposed API.

## High Priority

- [x] [BaseDialog](./01-base-dialog.md) — Shared dialog wrapper (Backdrop + Viewport + ScrollArea + Popup + Header + Close). 5 dialogs, ~250 LOC savings.
- [x] [TextInput](./02-text-input.md) — Shared styled input element (`apps/web/src/components/ui/text-input.tsx`). 7 inputs replaced across 5 files, border-color and text-sm inconsistencies resolved.
- [x] [FormField](./03-form-field.md) — Field.Root + Label + Control + error wrapper. 7 instances across 4 files. Pairs with TextInput. ~60 LOC savings.
- [x] [Inline Avatar](./04-inline-avatar.md) — Consolidate 8 inline avatar implementations onto a single Avatar component (`apps/web/src/components/ui/avatar.tsx`). ~120 LOC savings.
- [x] [SectionLabel](./05-section-label.md) — Uppercase section header label (`apps/web/src/components/ui/section-label.tsx`). 5 instances replaced across 5 files, color inconsistency between `legend` and other elements resolved.

## Medium Priority

- [x] [ErrorMessage](./06-error-message.md) — Inline error text display (`apps/web/src/components/ui/error-message.tsx`). 4 instances replaced across 4 files, 3 missing dark mode pairings fixed.
- [x] [Button](./07-button.md) — Primary/secondary/danger button with CVA variants (`apps/web/src/components/ui/button.tsx`). 4 instances replaced across 3 files, border-radius and padding inconsistencies resolved.
- [x] [SwitchOption](./08-switch-option.md) — Toggle switch with icon + label + description (`apps/web/src/components/ui/switch-option.tsx`). 4 duplicated switch blocks replaced across 2 files.
- [x] [EmptyState](./09-empty-state.md) — Icon + heading + description + optional action (`apps/web/src/components/ui/empty-state.tsx`). 3 instances replaced across 3 files, missing dark mode pairings fixed.

## Low Priority

- [x] [PresenceIndicator](./10-presence-indicator.md) — Moved local component to shared UI (`apps/web/src/components/ui/presence-indicator.tsx`). Import updated in user-result-list.

## Completed

- [x] **IconButton** (`apps/web/src/components/ui/icon-button.tsx`) — Shared icon button with ghost/primary/danger variants and xs/sm/md/lg sizes. 9 buttons replaced across 7 files.
