# Reusable Components — Tracking

Extracted UI patterns that should be consolidated into shared components. Each item links to a detailed issue file with code references, inconsistencies, and a proposed API.

## High Priority

- [x] [BaseDialog](./01-base-dialog.md) — Shared dialog wrapper (Backdrop + Viewport + ScrollArea + Popup + Header + Close). 5 dialogs, ~250 LOC savings.
- [x] [TextInput](./02-text-input.md) — Shared styled input element (`apps/web/src/components/ui/text-input.tsx`). 7 inputs replaced across 5 files, border-color and text-sm inconsistencies resolved.
- [x] [FormField](./03-form-field.md) — Field.Root + Label + Control + error wrapper. 7 instances across 4 files. Pairs with TextInput. ~60 LOC savings.
- [ ] [Inline Avatar](./04-inline-avatar.md) — Consolidate 8 inline avatar implementations onto a single Avatar component. ~120 LOC savings.
- [ ] [SectionLabel](./05-section-label.md) — Uppercase section header label. 7 instances with a color inconsistency between `legend` and other elements.

## Medium Priority

- [ ] [ErrorMessage](./06-error-message.md) — Inline error text display. 8+ instances, 3 missing dark mode pairing.
- [ ] [Button](./07-button.md) — Primary/secondary button with CVA variants. 5+ instances with border-radius and padding inconsistencies.
- [ ] [SwitchOption](./08-switch-option.md) — Toggle switch with icon + label + description. 2 identical instances in NotificationSection.
- [ ] [EmptyState](./09-empty-state.md) — Icon + heading + description + optional action. 3 instances across sidebar, messages, and search.

## Low Priority

- [ ] [PresenceIndicator](./10-presence-indicator.md) — Move existing local component to shared UI. Integrate presence dot with Avatar.

## Completed

- [x] **IconButton** (`apps/web/src/components/ui/icon-button.tsx`) — Shared icon button with ghost/primary/danger variants and xs/sm/md/lg sizes. 9 buttons replaced across 7 files.
