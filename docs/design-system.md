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

### Rules

1. **Don't create new keyframe animations** without adding them to `globals.css` and documenting them here.
2. **Don't use `animate-bounce`, `animate-spin`, or other Tailwind built-ins** (except `animate-pulse` for skeletons).
3. **Keep durations short.** Nothing in the app should animate longer than 400ms except infinite loops (typing, pending).

## Component Patterns

These are the canonical patterns. When building new components, follow these shapes exactly.

### Avatars

```tsx
// Standard (conversations, headers)
<div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
  <img src={url} alt={name} className="h-full w-full object-cover" />
</div>

// Fallback (no image)
<div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400 text-sm">
  {name.slice(0, 1)}
</div>

// Small variant (group stacking)
// Use h-7 w-7 and text-xs
```

Sizes: `h-10 w-10` (standard), `h-7 w-7` (small, group stacking). Don't use other sizes.

### Buttons

```tsx
// Primary action
<button className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
  Create
</button>

// Secondary / ghost
<button className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
  Cancel
</button>

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

// Destructive
<button className="text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30">
  Delete
</button>
```

### Inputs

```tsx
<input
  type="text"
  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
/>
```

Every text input follows this exact pattern. Don't vary the border color, radius, or focus behavior.

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

Standardized values: `rounded-2xl`, `p-6`, `shadow-xl`, `bg-white dark:bg-slate-800`, backdrop `z-50 bg-black/40`, title `text-xl font-bold`, subtitle `text-xs font-semibold uppercase`. All dialogs are wrapped in `ScrollArea` for safe scrolling on small viewports.

### Context Menus

```tsx
<ContextMenu.Popup className="min-w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
  <ContextMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
    <Icon className="h-4 w-4" />
    Action
  </ContextMenu.Item>
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

### Form Labels

```tsx
<label className="text-sm text-slate-600 dark:text-slate-400">
  Field name
</label>
```

### Error Messages

```tsx
<p className="text-sm text-red-600">Error description</p>
```

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
- [ ] Spacing uses even multiples where possible (`gap-2`, `gap-4`, `gap-6`)
