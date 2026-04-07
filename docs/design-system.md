# Design System

This document defines the visual language for the entire application. Every component, page, and feature must follow these rules to maintain consistency. When in doubt, check existing components for precedent — if no precedent exists, follow this doc.

We use Tailwind CSS v4 with raw utility classes (no CSS custom properties, no theme config). The system is intentionally minimal — a chat app needs fewer patterns than a dashboard, so we keep the surface area small.

## Color Palette

### Primary — Indigo

Indigo is the brand color. It's used for primary actions, the current user's messages, selected states, and badges.

| Usage | Light Mode | Dark Mode |
|---|---|---|
| Primary buttons, send button | `bg-indigo-600 text-white` | `bg-indigo-600 text-white` |
| Own message bubbles | `bg-indigo-600 text-white` | `bg-indigo-600 text-white` |
| Selected conversation | `bg-indigo-50` | `dark:bg-indigo-900/30` |
| Unread badge | `bg-indigo-600 text-white` | `bg-indigo-600 text-white` |
| Toggle pressed state | `bg-indigo-600 text-white` | `dark:bg-indigo-600 text-white` |
| Focus ring on inputs | `focus:border-indigo-500` | `focus:border-indigo-500` |

Indigo does not change between light and dark mode for primary actions — `bg-indigo-600` stays the same.

### Neutral — Slate

Slate is the workhorse palette. It's used for text, backgrounds, borders, and all UI chrome.

| Usage | Light Mode | Dark Mode |
|---|---|---|
| Page background | `bg-white` | `dark:bg-slate-900` |
| Card/surface background | `bg-slate-100` | `dark:bg-slate-700` |
| Elevated surface (dialogs, popovers) | `bg-white` | `dark:bg-slate-800` |
| Input background | `bg-white` (or transparent) | `dark:bg-slate-700` or `dark:bg-slate-900` |
| Primary text | `text-slate-900` | `dark:text-slate-100` |
| Secondary text | `text-slate-500` | `dark:text-slate-400` |
| Tertiary text (timestamps, hints) | `text-slate-400` | `dark:text-slate-400` |
| Label text | `text-slate-600` | `dark:text-slate-400` |
| Borders | `border-slate-200` | `dark:border-slate-700` |
| Input borders | `border-slate-200` | `dark:border-slate-600` |
| Hover background | `hover:bg-slate-50` or `hover:bg-slate-100` | `dark:hover:bg-slate-700` |
| Avatar fallback | `bg-slate-100 text-slate-500` | `dark:bg-slate-700 dark:text-slate-400` |
| Other user's message bubble | `bg-slate-100 text-slate-900` | `dark:bg-slate-700 dark:text-slate-100` |
| Placeholder text | (default) | `dark:placeholder:text-slate-500` |

### Status — Red, Emerald

Status colors are used sparingly for feedback states:

| Usage | Classes |
|---|---|
| Error text | `text-red-600` (light), `dark:text-red-400` (dark) |
| Error toast | `bg-red-600 text-white` |
| Destructive action (hover) | `text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30` |
| Failed message indicator | `text-red-300` (on indigo background) |
| Success toast | `bg-emerald-600 text-white` |
| Info toast | `bg-slate-700 text-white` |

No other status colors exist. If you need a warning state, use `text-slate-600` with a warning icon — don't introduce yellow/amber.

### Rules

1. **Every background class needs a dark mode pair.** If you write `bg-slate-100`, you must also write `dark:bg-slate-700`. No exceptions.
2. **Never use raw hex, RGB, or HSL values.** Always use Tailwind's named palette (`slate-*`, `indigo-*`, `red-*`, `emerald-*`).
3. **Never use other Tailwind color families** (gray, zinc, neutral, stone, blue, violet, etc.). The palette is slate + indigo + red + emerald. That's it.
4. **Indigo-600 is the only primary shade.** Don't use `indigo-500` or `indigo-700` for buttons or actions. `indigo-50` and `indigo-900/30` are only for selected state backgrounds.

## Dark Mode

### Implementation

Dark mode uses the `.dark` class on `<html>`, toggled via `use-dark-mode.ts`. User preference is stored in `localStorage("newchat.theme")` with system preference as fallback.

A synchronous `<script>` in `<head>` applies the class before React hydrates, preventing a flash of wrong theme.

### Pairing Convention

Every interactive element must specify both light and dark variants. The standard pairings are:

```
bg-white              ↔  dark:bg-slate-900       (page background)
bg-slate-100          ↔  dark:bg-slate-700       (surfaces, cards, fallbacks)
bg-white              ↔  dark:bg-slate-800       (elevated: dialogs, popovers, dropdowns)
text-slate-900        ↔  dark:text-slate-100     (primary text)
text-slate-500        ↔  dark:text-slate-400     (secondary text)
text-slate-600        ↔  dark:text-slate-400     (labels)
border-slate-200      ↔  dark:border-slate-700   (standard borders)
border-slate-200      ↔  dark:border-slate-600   (input borders)
hover:bg-slate-50     ↔  dark:hover:bg-slate-700 (hover on white bg)
hover:bg-slate-100    ↔  dark:hover:bg-slate-700 (hover on surface bg)
ring-white            ↔  dark:ring-slate-800     (avatar ring)
```

### Depth Strategy

In dark mode, depth is communicated through lightness shifts — darker = further back, lighter = more prominent:

```
Background (slate-900) → Surface (slate-700/800) → Elevated (slate-800)
```

Shadows exist but are secondary cues — they're harder to perceive on dark backgrounds. Don't rely on `shadow-*` alone to create separation in dark mode; always pair with background color differences.

## Typography

### Font Stack

System fonts only. No custom fonts are loaded.

```css
font-family: system-ui, -apple-system, sans-serif;
```

### Text Scale

| Tailwind Class | Usage | Example |
|---|---|---|
| `text-xl font-bold` | Dialog titles | "New conversation" |
| `text-lg font-semibold` | Page headers, section titles | "Welcome back, Name" |
| `text-sm font-semibold` | Conversation names, button labels, inline headings | "John Doe", "Create" |
| `text-sm` | Body text, message content, menu items | Message text, conversation preview |
| `text-xs` | Timestamps, secondary info, subtitles, status text | "2 min ago", "online", "Typing..." |
| `text-[10px]` | Message metadata (time + read status inside bubble) | "12:34" inside a message |

### Rules

1. **`text-sm` is the default.** Most body text, messages, form inputs, and interactive elements use `text-sm`.
2. **`text-xs` is for supporting information** — timestamps, presence status, badge text, type hints. Never use it for primary content.
3. **`text-[10px]` is only for inside message bubbles** — the timestamp and read receipt indicator at the bottom of each message.
4. **`font-semibold` is the only bold weight.** Don't use `font-bold` except for dialog titles (`text-xl font-bold`). Don't use `font-medium`.
5. **Don't use `text-base` or larger** for body text. The entire app runs at `text-sm` density. `text-lg` and above are reserved for headers.

## Spacing

### Padding Convention

| Context | Pattern | Examples |
|---|---|---|
| Section headers (chat header, sidebar header) | `px-6 py-4` | ChatHeader, SidebarHeader |
| List items (conversations, menu items) | `px-4 py-3` | ConversationListItem |
| Menu items (context menus, dropdowns) | `px-3 py-2` | ContextMenu items |
| Inputs and textareas | `px-3 py-2` or `px-4 py-2` | Form inputs, MessageTextarea |
| Buttons | `px-4 py-2` (standard) or `px-3 py-1` (pill/toggle) | Submit buttons, toggle pills |
| Dialog body | `p-6` | NewChatDialog |
| Compact inline elements | `px-2 py-0.5` | Unread badge |

### Gap Convention

| Gap | Usage |
|---|---|
| `gap-1` | Tight groupings (icon + text in a line, stacked metadata) |
| `gap-2` | Standard inline spacing (buttons in a row, small lists) |
| `gap-3` | List items, form fields, sidebar items |
| `gap-4` | Section separation within a form or dialog (`space-y-4`) |

### Container Widths

| Width | Usage |
|---|---|
| `w-80` | Sidebar |
| `max-w-md` (448px) | Message bubbles, dialog popups |
| `min-w-40` | Context menus |
| `min-w-6` | Unread badge (minimum readable width) |

## Border Radius

| Radius | Usage |
|---|---|
| `rounded-full` | Avatars, pills, unread badges, toggle buttons, icon buttons |
| `rounded-2xl` | Message bubbles, dialog popups |
| `rounded-lg` | Inputs, cards, context menus, containers, buttons |
| `rounded-md` | Menu items (inside context menus) |

### Rules

1. **Avatars are always `rounded-full`.**
2. **Message bubbles and dialogs use `rounded-2xl`** — they are the most prominent visual elements and get the largest radius.
3. **Everything else uses `rounded-lg`** — inputs, buttons, cards, menus.
4. **`rounded-md` is only for items nested inside a `rounded-lg` container** (e.g., menu items inside a context menu popup).
5. **Never use `rounded`, `rounded-sm`, or `rounded-xl`.** The scale is: `rounded-full` > `rounded-2xl` > `rounded-lg` > `rounded-md`.

## Shadows

Shadows are used sparingly. Most depth comes from background color differences.

| Shadow | Usage |
|---|---|
| `shadow` | Message bubbles |
| `shadow-lg` | Floating UI — context menus, popovers, toasts |
| `shadow-xl` | Dialogs (most elevated floating surface) |

### Rules

1. **No shadows on flat elements.** Cards, sidebar items, headers, and inputs have no shadow.
2. **Shadows only appear on elements that float above the page** — message bubbles, menus, toasts, dialogs.
3. **Don't use `shadow-sm` or `shadow-md`.** The scale is: `shadow` (subtle) → `shadow-lg` (floating) → `shadow-xl` (dialog).

## Interactive States

### Hover

| Element Type | Hover Pattern |
|---|---|
| List items (conversations, menu items) | `hover:bg-slate-50 dark:hover:bg-slate-700` |
| Icon buttons | `hover:bg-slate-100 dark:hover:bg-slate-700` |
| Primary buttons | `hover:opacity-90` (or no hover change) |
| Text links | `hover:text-slate-700 dark:hover:text-slate-200` |
| Destructive menu items | `hover:bg-red-50 dark:hover:bg-red-900/30` |

### Focus

All inputs use the same focus pattern:

```
focus:border-indigo-500 focus:outline-none
```

No focus rings (`ring-*`) on inputs — the border color change is sufficient. On buttons, rely on the browser's default focus indicator or add `focus-visible:ring-2 focus-visible:ring-indigo-500` if needed.

### Disabled

```
disabled:opacity-50
```

No other disabled styles. Don't change the background or border for disabled elements — opacity reduction is enough.

### Active/Pressed

For buttons with immediate feedback:

```
active:opacity-80
```

For toggles (e.g., DM/Group selector):

```
data-pressed:bg-indigo-600 data-pressed:text-white
```

## Animations

All custom animations are defined in `globals.css`. Use these instead of inventing new ones.

| Animation | Class | Duration | Usage |
|---|---|---|---|
| Message send | `animate-message-send` | 350ms (spring ease) | Optimistic message appearing in the list |
| Pending indicator | `animate-pending-clock` | 1500ms (infinite pulse) | Clock icon on unsent messages |
| Typing dots | `typing-dot` | 1400ms (infinite bounce) | Three dots in typing indicator |
| Toast enter | `toast-enter` | 200ms (slide from right) | Toast notifications appearing |
| Fade in up | `animate-fade-in-up` | 300ms | Landing page message sequence |
| Skeleton pulse | `animate-pulse` | (Tailwind default) | Loading placeholders |
| Floating popup | `floating-popup` | 150ms (scale + fade) | Popovers, context menus, combobox dropdowns |
| Floating content | `floating-content` | 150ms (staggered slide + fade) | Inner content of floating surfaces |
| Tooltip | `tooltip-popup` | 100ms (scale + fade) | Tooltip popups |
| Dialog backdrop | `dialog-backdrop` | 200ms (fade) | Dialog overlay |
| Dialog popup | `dialog-popup` | 200ms (scale + fade) | Dialog panel |
| Dialog content | `dialog-content` | 150ms (staggered slide + fade) | Inner content of dialogs |

### Staggered Delays

For the typing indicator dots, use staggered delays:

```
<span className="typing-dot" />
<span className="typing-dot animation-delay-200" />
<span className="typing-dot animation-delay-400" />
```

### Transitions

For interactive state changes (hover, focus), use Tailwind's `transition` or `transition-colors`:

```tsx
// Good — color transitions on interactive elements
<button className="transition hover:bg-slate-100">

// Good — for drawer animations
<div className="transition-transform duration-450">
```

Don't add `transition-all` to everything — only transition the properties that actually change.

### Floating Surface Transitions

All floating surfaces (popovers, context menus, combobox dropdowns) use a two-layer enter/exit animation powered by Base UI's `data-starting-style` / `data-ending-style` attributes. Classes are defined in `globals.css`.

**Layer 1 — Container (`floating-popup`):** The popup scales (Y-axis) and fades. Uses `--transform-origin` from Base UI's Positioner, which auto-adapts when the popup flips due to viewport collision.

**Layer 2 — Content (`floating-content`):** A wrapper `<div>` inside the popup slides horizontally and fades with a staggered delay. Content enters 150ms after the container scales in, but exits immediately on close.

```tsx
<Popover.Positioner side="bottom" align="start" sideOffset={8}>
  <Popover.Popup className="floating-popup rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
    <div className="floating-content">
      {/* Menu items */}
    </div>
  </Popover.Popup>
</Popover.Positioner>
```

**Tooltips** use `tooltip-popup` — a lighter, faster variant (100ms, subtle uniform scale, no content wrapper):

```tsx
<Tooltip.Positioner sideOffset={6}>
  <Tooltip.Popup className="tooltip-popup rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-slate-700">
    {label}
  </Tooltip.Popup>
</Tooltip.Positioner>
```

### Dialog Transitions

Dialogs use a three-layer enter/exit animation. Classes are defined in `globals.css` and applied automatically by `BaseDialog`.

**Backdrop (`dialog-backdrop`):** Fades in/out over 200ms.

**Popup (`dialog-popup`):** Scales uniformly from center (0.95 → 1) and fades over 200ms. Slower than floating surfaces because dialogs are larger and more prominent.

**Content (`dialog-content`):** Inner content slides up and fades with a staggered delay (enters 150ms after popup, exits immediately).

| | Floating surfaces | Dialogs |
|---|---|---|
| Scale | `scale: 1 0.4` (Y-only) | `scale: 0.95` (uniform) |
| Origin | `var(--transform-origin)` (adaptive) | Center (implicit) |
| Content slide | Horizontal (`-1rem 0`) | Vertical (`0 0.5rem`) |
| Duration | 150ms | 200ms |
| Backdrop | None | Fades in/out |

These transitions are built into `BaseDialog` — no additional classes needed when using it.

### Conversation Switch Transition

When the user switches conversations, the chat panel plays a two-phase directional slide:

1. **Exit (`animate-conversation-exit`):** Current messages slide right (`translateX(2rem)`) and fade out over 150ms with `ease-in`. `pointer-events: none` prevents interaction with stale content.
2. **Enter (`animate-conversation-enter`):** New messages slide in from the left (`translateX(-2rem)` → `0`) and fade in over 150ms with `ease-out`.

The transition is managed by `useConversationTransition` in `page.tsx`, which decouples the **selected** conversation (what the user clicked) from the **displayed** conversation (what's rendered). The wrapper div around `ChatPanel` receives the animation classes while the panel inside remounts via React `key`.

First load (no previous conversation) skips the animation entirely.

### Rules

1. **Don't create new keyframe animations** without adding them to `globals.css` and documenting them here.
2. **Don't use `animate-bounce`, `animate-spin`, or other Tailwind built-ins** (except `animate-pulse` for skeletons).
3. **Keep durations short.** Nothing in the app should animate longer than 400ms except infinite loops (typing, pending).
4. **Every floating surface must use the standard transition classes.** Popovers, context menus, and combobox dropdowns use `floating-popup` + `floating-content`. Tooltips use `tooltip-popup`. Dialogs use `BaseDialog` which applies `dialog-backdrop`, `dialog-popup`, and `dialog-content` automatically.

## Component Patterns

These are the canonical patterns. When building new components, follow these shapes exactly.

### Avatars

Use the shared `Avatar` component (`apps/web/src/components/ui/avatar.tsx`). Do not render avatars inline.

```tsx
import { Avatar } from "@/components/ui/avatar";

// Standard (conversations, headers, member lists)
<Avatar avatarUrl={user.avatarUrl} name={user.firstName} />

// Small (group stacking, search combobox)
<Avatar avatarUrl={user.avatarUrl} name={user.firstName} size="xs" />

// With presence indicator (online/offline dot overlay)
<Avatar avatarUrl={user.avatarUrl} name={user.firstName} status="online" />

// Large with custom fallback (upload variants)
<Avatar avatarUrl={preview ?? null} name="Avatar" size="2xl" fallback="No image" className="border border-slate-200 dark:border-slate-600" />
```

**Size variants (CVA):**

| Name | Dimensions | Fallback text |
|------|-----------|---------------|
| `xs` | `h-7 w-7` | `text-xs` |
| `sm` | `h-9 w-9` | `text-sm` |
| `md` | `h-10 w-10` | `text-sm` (default) |
| `lg` | `h-20 w-20` | `text-lg` |
| `xl` | `h-24 w-24` | `text-lg` |
| `2xl` | `h-30 w-30` | `text-lg` |

**Props:** `avatarUrl`, `name`, `size?`, `status?` (`"online"` | `"offline"`), `fallback?` (ReactNode), `className?`.

### Buttons

Use the shared `Button` component (`components/ui/button.tsx`) for all text buttons. It uses CVA for variant and size management.

```tsx
import { Button } from "@/components/ui/button";

// Primary (default) — main actions
<Button onClick={handleCreate} disabled={isPending}>Create</Button>

// Secondary — cancel, dismiss
<Button variant="secondary">Cancel</Button>

// Danger — destructive actions
<Button variant="danger">Delete</Button>

// Size variants
<Button size="sm">Small</Button>     // px-3 py-1 text-xs
<Button size="md">Medium</Button>    // px-4 py-2 text-sm (default)
<Button size="lg">Large</Button>     // px-6 py-2 text-sm

// Full width
<Button className="w-full">Submit</Button>

// With Dialog.Close (Base UI)
<Dialog.Close render={<Button variant="secondary" />}>Cancel</Dialog.Close>
```

**Variant styles (CVA):**

| Variant | Light | Dark |
|---------|-------|------|
| `primary` | `bg-indigo-600 text-white hover:bg-indigo-500` | same |
| `secondary` | `border border-slate-300 text-slate-700` | `dark:border-slate-600 dark:text-slate-400` |
| `danger` | `text-red-600 hover:bg-red-50` | `dark:text-red-400 dark:hover:bg-red-900/30` |

All buttons use `rounded-full font-semibold transition disabled:opacity-50`.

```tsx
// Icon button — use the IconButton component (apps/web/src/components/ui/icon-button.tsx)
import { IconButton } from "@/components/ui/icon-button";

// Ghost (default) — secondary actions
<IconButton label="Edit" onClick={handleEdit}>
  <Pencil className="h-5 w-5" />
</IconButton>

// Primary — primary actions (new chat, send)
<IconButton variant="primary" size="lg" label="New chat" onClick={handleNew}>
  <Plus className="h-4 w-4" />
</IconButton>

// Danger — destructive actions (remove member)
<IconButton variant="danger" size="sm" title="Remove" onClick={handleRemove}>
  <X className="h-4 w-4" />
</IconButton>

// Sizes: xs (p-0.5), sm (p-1), md (p-1.5, default), lg (p-2)
// All icon buttons use rounded-full. Pass className for one-offs.

// Pill toggle
<button className="rounded-full px-3 py-1 text-sm font-semibold bg-slate-100 dark:bg-slate-700 data-pressed:bg-indigo-600 data-pressed:text-white">
  Option
</button>
```

### Inputs

Use the shared `TextInput` component (`components/ui/text-input.tsx`) for all text inputs. It applies the canonical styles and supports `className` overrides via `cn()` (twMerge).

```tsx
import { TextInput } from "@/components/ui/text-input";

<TextInput
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Enter name…"
  className="mt-1"  // spacing overrides only
/>
```

Built-in styles: `w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 aria-invalid:border-red-500`.

Don't vary the border color, radius, or focus behavior. Use `className` only for layout concerns like spacing (`mt-1`) or width adjustments (`pr-8`).

### Section Labels

Use the shared `SectionLabel` component (`components/ui/section-label.tsx`) for uppercase section headers. It supports a polymorphic `as` prop to render as any HTML element or component.

```tsx
import { SectionLabel } from "@/components/ui/section-label";

// Default (renders as <span>)
<SectionLabel>Members</SectionLabel>

// As a <legend> inside a <fieldset>
<SectionLabel as="legend">Notifications</SectionLabel>

// As a heading
<SectionLabel as="h3">Members <span className="ml-1">({count})</span></SectionLabel>

// As a Base UI component with extra layout classes
<SectionLabel as={Collapsible.Trigger} className="flex items-center gap-1">
  People
  <ChevronDown className="h-3 w-3" />
</SectionLabel>
```

Canonical style: `text-xs font-semibold uppercase text-slate-500 dark:text-slate-400`. Pass `className` for layout concerns only (flex, spacing). Do not override the typography or color tokens.

### Dialogs

Use the shared `BaseDialog` component (`components/ui/base-dialog.tsx`) for all dialogs. It standardizes the wrapper structure (Backdrop, Viewport, ScrollArea, Popup, Header, Close button).

```tsx
<BaseDialog
  open={open}
  onOpenChange={onOpenChange}
  title="Dialog title"
  subtitle="Optional subtitle"   // renders as Dialog.Description below the title
  size="md"                       // "md" (max-w-md) | "lg" (max-w-lg)
  stacked                         // optional — bumps z-index for nested dialogs (z-60/z-70)
>
  <div className="mt-4 space-y-4">
    {/* Dialog body content */}
  </div>
</BaseDialog>
```

Standardized values: `rounded-2xl`, `p-6`, `shadow-xl`, `bg-white dark:bg-slate-800`, backdrop `z-50 bg-black/40`, title `text-xl font-bold`, subtitle `text-xs font-semibold uppercase`. All dialogs are wrapped in `ScrollArea` for safe scrolling on small viewports. Enter/exit transitions (`dialog-backdrop`, `dialog-popup`, `dialog-content`) are built-in — no additional classes needed.

### Context Menus

```tsx
<ContextMenu.Popup className="floating-popup min-w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
  <div className="floating-content">
    <ContextMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
      <Icon className="h-4 w-4" />
      Action
    </ContextMenu.Item>
  </div>
</ContextMenu.Popup>
```

### Toasts

```tsx
// Error
<div className="rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg">

// Success
<div className="rounded-lg bg-emerald-600 px-4 py-3 text-sm text-white shadow-lg">

// Info
<div className="rounded-lg bg-slate-700 px-4 py-3 text-sm text-white shadow-lg">
```

Toasts are always `rounded-lg`, `shadow-lg`, `text-sm`, positioned `fixed bottom-4 right-4`.

### Form Fields

Use the shared `FormField` component (`components/ui/form-field.tsx`) for all labeled form fields. It wraps Base UI's `Field.Root`, `Field.Label`, `Field.Error`, and `Field.Description` with standardized styling.

```tsx
import { FormField } from "@/components/ui/form-field";
import { TextInput } from "@/components/ui/text-input";

// Basic field
<FormField label="Display name">
  <TextInput value={name} onChange={(e) => setName(e.target.value)} />
</FormField>

// Field with error
<FormField label="Username" error={usernameError}>
  <TextInput value={username} onChange={(e) => setUsername(e.target.value)} />
</FormField>

// Field with description (shows description unless error is present)
<FormField label="Username" error={usernameError} description="3-32 characters, letters, numbers, and underscores.">
  <TextInput value={username} onChange={(e) => setUsername(e.target.value)} />
</FormField>

// Non-input children (combobox, custom controls)
<FormField label="Search teammate">
  <UserSearchCombobox value={user} onValueChange={setUser} />
</FormField>
```

Built-in styles:
- Root: `flex flex-col text-sm`
- Label: `text-slate-600 dark:text-slate-400`
- Error: `mt-1 text-xs text-red-600 dark:text-red-400`
- Description: `mt-1 text-xs text-slate-500 dark:text-slate-400`
- Children wrapper: `mt-1`

The `invalid` prop on `Field.Root` is automatically set from `!!error`. Use `className` on `FormField` only for layout concerns.

### Form Labels

If you need a standalone label outside of `FormField`:

```tsx
<label className="text-sm text-slate-600 dark:text-slate-400">
  Field name
</label>
```

### Error Messages

Use the shared `ErrorMessage` component (`components/ui/error-message.tsx`) for all inline error text. It renders nothing when children is falsy, so you don't need `{error && ...}` guards.

```tsx
import { ErrorMessage } from "@/components/ui/error-message";

// Standard field-level error (also used internally by FormField)
<ErrorMessage>{error}</ErrorMessage>

// Standalone error with custom spacing
<ErrorMessage className="mt-6">{errorMessage}</ErrorMessage>
```

Canonical style: `mt-1 text-xs text-red-600 dark:text-red-400`. Use `className` only for spacing overrides (`mt-2`, `mt-6`). Do not override the color or typography tokens.

### Empty States

Use the shared `EmptyState` component (`components/ui/empty-state.tsx`) for icon + heading + description + optional action layouts shown when no data is available.

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

// With action button
<EmptyState
  icon={<MessageCircle className="h-12 w-12" strokeWidth={1} />}
  heading="No conversations yet"
  description="Search for people above or start a new chat."
  action={<Button size="sm" onClick={onAction}>Start a new chat</Button>}
/>

// Without action
<EmptyState
  icon={<Mail className="h-12 w-12" strokeWidth={1} />}
  heading="No messages yet"
  description="Send the first message to start the conversation."
  className="py-16"
/>
```

Layout: `flex flex-col items-center justify-center text-center`. Icon color: `text-slate-300 dark:text-slate-600`. Heading: `mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300`. Description: `mt-1 text-xs text-slate-500 dark:text-slate-400`. Action wrapper: `mt-4`.

### Switch Options

Use the shared `SwitchOption` component (`components/ui/switch-option.tsx`) for toggle switches with icon + label + description layout.

```tsx
import { SwitchOption } from "@/components/ui/switch-option";
import { Bell } from "lucide-react";

<SwitchOption
  checked={enabled}
  onCheckedChange={setEnabled}
  icon={<Bell className="h-4 w-4" />}
  label="Browser notifications"
  description="Get notified about new messages even when the tab is in the background"
/>
```

Wraps Base UI's `Switch.Root` + `Switch.Thumb` inside a bordered container (`rounded-lg border border-slate-200 p-3 dark:border-slate-700`). Icon color is applied by the component (`text-slate-600 dark:text-slate-400`).

### Presence Indicator

Use the shared `PresenceIndicator` component (`components/ui/presence-indicator.tsx`) for inline presence status (dot + label text). For avatar-overlay dots, use Avatar's `status` prop instead.

```tsx
import { PresenceIndicator } from "@/components/ui/presence-indicator";

// Inline text indicator (user search results, profiles)
<PresenceIndicator presence={user.presence} />
// Renders: [●] Online | [●] Last seen 14:30 | [●] Offline

// Avatar with presence dot overlay (use Avatar's built-in status prop)
<Avatar avatarUrl={url} name={name} status="online" />
```

Style: `flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400`. Dot: `h-2 w-2 rounded-full` with `bg-emerald-500` (online) or `bg-slate-400` (offline).

## Icons

All icons come from **Lucide React** (`lucide-react`). Don't use other icon libraries.

| Size | Class | Usage |
|---|---|---|
| `h-6 w-6` | Large icons — mobile hamburger menu |
| `h-5 w-5` | Standard icons — sidebar actions, header buttons |
| `h-4 w-4` | Small icons — inside menu items, inline with text |
| Size prop `12` | Tiny — check marks inside message bubbles |

### Rules

1. **Icon color comes from the parent's `text-*` class.** Don't set color on the icon itself.
2. **Use `strokeWidth={2}` (default) for all icons.** Don't thin or thicken strokes.
3. **Use `IconButton` for icon-only buttons** with a `label` prop to get an accessible tooltip automatically. Use `title` attribute as fallback when a tooltip isn't appropriate.

## Anti-Patterns

| Never do this | Do this instead |
|---|---|
| `bg-gray-*`, `bg-zinc-*`, `bg-neutral-*` | `bg-slate-*` |
| `bg-blue-*`, `bg-violet-*` for actions | `bg-indigo-600` |
| `bg-[#1e293b]` or any hex/rgb value | Named Tailwind class |
| `text-base` for body copy | `text-sm` |
| `font-bold` for labels/buttons | `font-semibold` |
| `font-medium` | `font-semibold` or nothing |
| `rounded` / `rounded-sm` / `rounded-xl` | `rounded-lg` or `rounded-2xl` |
| `shadow-sm` / `shadow-md` | `shadow` or `shadow-lg` |
| `transition-all` on everything | `transition` or `transition-colors` only where needed |
| `gap-5`, `gap-7`, `p-5`, `p-7` | Prefer even multiples: `gap-4`, `gap-6`, `p-4`, `p-6` |
| `bg-slate-100` without `dark:bg-slate-*` | Always pair light and dark variants |
| `ring-*` on inputs for focus | `focus:border-indigo-500 focus:outline-none` |
| Custom icon component / SVG inline | Lucide React icon |
| New keyframe animation not in globals.css | Add to `globals.css` first, then use |
| `text-green-*` or `text-yellow-*` for status | `text-emerald-600` (success) or `text-red-600` (error) only |

## New UI Checklist

Before shipping any new component or page, verify:

- [ ] Every `bg-*` class has a `dark:bg-*` pair
- [ ] Every `text-*` color class has a `dark:text-*` pair
- [ ] Every `border-*` color class has a `dark:border-*` pair
- [ ] Every `hover:bg-*` class has a `dark:hover:bg-*` pair
- [ ] Only slate, indigo, red, emerald color families are used
- [ ] Body text uses `text-sm`, not `text-base`
- [ ] Font weight is `font-semibold` or absent — never `font-bold` (except dialog titles) or `font-medium`
- [ ] Border radius follows the scale: `rounded-full` / `rounded-2xl` / `rounded-lg` / `rounded-md`
- [ ] Shadows follow the scale: `shadow` / `shadow-lg` / `shadow-xl`
- [ ] Icons are from Lucide React at standard sizes (h-4/h-5/h-6)
- [ ] Inputs use the standard focus pattern: `focus:border-indigo-500 focus:outline-none`
- [ ] No new animations without adding to `globals.css`
- [ ] Floating surfaces use `floating-popup` + `floating-content` (or `tooltip-popup` for tooltips)
- [ ] Spacing uses even multiples where possible (`gap-2`, `gap-4`, `gap-6`)
