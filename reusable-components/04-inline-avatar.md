# Inline Avatar — Consolidate Avatar Rendering

## Problem

An `Avatar` component exists at `apps/web/src/components/chat/conversation-avatar.tsx`, and a `UserAvatar` component exists at `apps/web/src/components/chat/user-result-list.tsx` (using Base-UI Avatar). Despite this, 7+ other locations render avatars inline with the same pattern: `rounded-full bg-slate-100 dark:bg-slate-700` container + image/fallback. The implementations use different image elements (`<img>` vs `next/image` `<Image>` vs Base-UI `Avatar`), different sizes, and slightly different fallback text sizes.

## Current Instances

### Existing Components

**Avatar (custom)** — `apps/web/src/components/chat/conversation-avatar.tsx` (lines 4-35)
```tsx
export function Avatar({ avatarUrl, name, size = "h-10 w-10", textSize = "text-sm" }) { ... }
```
Uses `<img>` for the image.

**UserAvatar (Base-UI)** — `apps/web/src/components/chat/user-result-list.tsx` (lines 75-88)
```tsx
<Avatar.Root className="h-10 w-10 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
  <Avatar.Image src={...} className="h-full w-full object-cover" />
  <Avatar.Fallback className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
    {user.firstName.slice(0, 1)}
  </Avatar.Fallback>
</Avatar.Root>
```

### Inline Avatar Implementations

**SidebarHeader.tsx** — `apps/web/src/components/chat/conversation-sidebar/components/SidebarHeader.tsx` (lines 34-46)
- Size: `h-9 w-9`, fallback text: `text-sm`
- Uses `<img>`

**CurrentUserCard.tsx** — `apps/web/src/components/chat/conversation-sidebar/components/CurrentUserCard.tsx` (lines 24-33)
- Size: `h-10 w-10`, fallback text: `text-sm`
- Uses Base-UI `Avatar.Root` + `Avatar.Image` + `Avatar.Fallback`

**profile-dialog.tsx** — `apps/web/src/components/users/profile-dialog.tsx` (lines 90-102)
- Size: `h-24 w-24`, fallback text: `text-lg`
- Uses `<img>`

**ProfileSection.tsx** — `apps/web/src/components/users/edit-profile-dialog/components/ProfileSection.tsx` (lines 27-41)
- Size: `h-30 w-30` (120px, with border), fallback text: `text-lg` "No image"
- Uses `next/image` `<Image>` with explicit `width={120} height={120}`
- Has hover overlay with Camera icon for upload

**AvatarPicker.tsx** — `apps/web/src/app/onboarding/components/AvatarPicker.tsx` (lines 21-38)
- Size: `h-20 w-20` (with border), fallback text: `text-xs` "No image"
- Uses `<img>`, includes loading spinner state
- Upload button is external (not overlay)

**user-search-combobox.tsx** — `apps/web/src/components/chat/user-search-combobox.tsx` (lines 66-79)
- Size: `h-7 w-7`, fallback text: `text-xs`
- Uses `next/image` with `fill` + `unoptimized`

**group-settings-dialog.tsx (MemberAvatar)** — `apps/web/src/components/chat/group-settings-dialog.tsx` (lines 18-42)
- Wraps the existing `Avatar` component but adds a presence dot overlay
- Defines a one-off `MemberAvatar` local component

## Inconsistencies

| Location | Size | Image element | Fallback text | Has presence dot |
|---|---|---|---|---|
| conversation-avatar.tsx | configurable | `<img>` | configurable | No |
| user-result-list.tsx | `h-10 w-10` | Base-UI Avatar | `text-sm` | No |
| SidebarHeader | `h-9 w-9` | `<img>` | `text-sm` | No |
| CurrentUserCard | `h-10 w-10` | Base-UI Avatar | `text-sm` | No |
| profile-dialog | `h-24 w-24` | `<img>` | `text-lg` | No |
| ProfileSection | `h-30 w-30` | `<Image>` | `text-lg` | No |
| AvatarPicker | `h-20 w-20` | `<img>` | `text-xs` | No |
| user-search-combobox | `h-7 w-7` | `<Image>` | `text-xs` | No |
| group-settings-dialog | `h-10 w-10` | via Avatar | `text-sm` | Yes (overlay) |

## Proposed Solution

Consolidate on a single `Avatar` component with consistent API. Either enhance the existing custom `Avatar` or switch fully to Base-UI `Avatar`. The component should support:

1. **Size prop** — accepting the same Tailwind size classes (`h-7 w-7`, `h-9 w-9`, `h-10 w-10`, `h-20 w-20`, `h-24 w-24`, `h-30 w-30`)
2. **Optional presence dot** — an overlay indicator for online/offline status, eliminating the one-off `MemberAvatar` in group-settings-dialog
3. **Consistent fallback** — first letter of name, with text size automatically scaled to container

Replace all 8 inline implementations with the unified component. The `ProfileSection` and `AvatarPicker` upload variants are special cases — they compose the Avatar with additional upload UI, so the base Avatar just needs to support those sizes.

## Related Docs
- `docs/design-system.md` lines 288-305 (Avatars section)
- `docs/design-system.md` lines 41 (Avatar fallback pairing)
- `docs/design-system.md` lines 90 (Avatar ring pairing)

## Estimated Impact
~120 lines of inline avatar code eliminated across 8 files. Prevents future drift between avatar implementations.
