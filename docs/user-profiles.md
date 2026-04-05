# User Profiles

## Users Table Schema

```sql
users {
  id                   integer PRIMARY KEY (generated always as identity)
  telegram_id          varchar(64) NOT NULL UNIQUE
  username             varchar(255)            -- alphanumeric handle, nullable
  first_name           varchar(255) NOT NULL   -- display name
  last_name            varchar(255)            -- optional surname
  avatar_url           text                    -- R2 CDN URL, nullable
  is_public            boolean NOT NULL DEFAULT true
  notification_channel notification_channel NOT NULL DEFAULT 'both'
  created_at           timestamp NOT NULL
  updated_at           timestamp NOT NULL
}
```

## tRPC Procedures

All procedures in `apps/server/src/trpc/routers/users.ts`. All are `protectedProcedure` (require JWT).

### users.me

Returns the current authenticated user's full profile.

```
users.me()
  → SELECT * FROM users WHERE id = ctx.userId
  → { user }
  Throws: NOT_FOUND (shouldn't happen for authenticated user)
```

### users.update

Updates the current user's profile fields.

```
users.update({
  username:    string (3-32 chars, /^[a-zA-Z0-9_]+$/)
  displayName: string (1-80 chars)
  avatar?:     string (URL, must start with R2_PUBLIC_URL)
  isPublic?:   boolean (default: true)
})
```

**Field mapping**: `displayName` → `firstName` column, `avatar` → `avatarUrl` column.

**Avatar validation**: URL must be hosted on the configured R2 CDN (`R2_PUBLIC_URL` env var). Rejects external URLs via Zod `.refine()`.

```
  → UPDATE users SET username, firstName, avatarUrl, isPublic, updatedAt WHERE id = ctx.userId
  → { user }
  Throws: NOT_FOUND if user doesn't exist
```

### users.search

Searches for users by username, first name, or last name. **Only returns public users.**

```
users.search({
  query: string (1-100 chars)
  limit?: number (1-25, default: 10)
})
```

**Search logic**:
1. Escape SQL wildcards (`%`, `_`, `\`) in query to prevent LIKE injection
2. Build pattern: `%{escaped}%`
3. Query: `WHERE isPublic = true AND (username ILIKE ? OR firstName ILIKE ? OR lastName ILIKE ?)`
4. Case-insensitive matching via PostgreSQL `ILIKE`
5. Each result enriched with real-time presence from Redis

```
  → { users: [{ id, username, firstName, lastName, avatarUrl, isPublic, presence }] }
```

### users.profile

Returns a single user's profile enriched with presence.

```
users.profile({ userId: number })
  → SELECT * FROM users WHERE id = userId
  → getPresenceStatus(userId) from Redis
  → { user: { ...columns, presence: { status, lastSeen } } }

  Throws: NOT_FOUND if user doesn't exist
  Throws: FORBIDDEN if user.isPublic === false AND userId !== ctx.userId
```

**Privacy rule**: Private profiles are only viewable by the user themselves.

### users.presence

Batch presence lookup for multiple users.

```
users.presence({ userIds: number[] (max 100) })
  → For each userId: getPresenceStatus(userId) from Redis
  → { entries: [{ userId, presence: { status, lastSeen } }] }
```

### users.updateNotificationPreferences

Updates the notification channel preference. See [push-notifications.md](push-notifications.md) for channel behavior.

```
users.updateNotificationPreferences({ channel: "web" | "telegram" | "both" | "none" })
  → UPDATE users SET notificationChannel, updatedAt WHERE id = ctx.userId
  → { user }
  Throws: NOT_FOUND if user doesn't exist
```

---

## isPublic Flag

Controls user discoverability. Defaults to `true` for all new users.

| Context             | isPublic = true          | isPublic = false              |
|---------------------|--------------------------|-------------------------------|
| `users.search`      | Appears in results       | Excluded from results         |
| `users.profile`     | Any authenticated user can view | Only self can view (FORBIDDEN for others) |
| `users.update`      | User can toggle off      | User can toggle on            |
| UI (ProfileDialog)  | "This user is discoverable" | "Private profile"          |

## Avatar URL & Telegram Sync

### What syncs from Telegram on login

When a user starts the Telegram bot (`/start` command in `apps/telegram-bot/src/index.ts`), the bot upserts the user record:

```
INSERT INTO users (telegramId, firstName, lastName, username)
  ON CONFLICT (telegramId) DO UPDATE SET firstName, lastName, username, updatedAt
```

**Synced fields**: `firstName`, `lastName`, `username` (from Telegram profile).
**Not synced**: `avatarUrl` — Telegram profile photos are **not** automatically fetched.

### Avatar upload flow

Users upload avatars manually through the EditProfileDialog:

```
1. User selects image file in UI
2. uploadFile() → trpc uploads.getPresignedUrl({ filename, contentType, size })
3. PUT file directly to R2 via presigned URL
4. trpc users.update({ avatar: publicUrl }) → stores in avatarUrl column
```

The `avatar` field in `users.update` validates that the URL starts with `R2_PUBLIC_URL` to prevent storing external URLs.

## Presence Enrichment

Presence data is stored in Redis (not the database) and merged into profile responses at query time.

**Redis key**: `presence:{userId}` → JSON `{ status: "online" | "offline", lastSeen: ISO8601 }`
**TTL**: 5 minutes (300 seconds). If key expires, user is implicitly offline.

```typescript
getPresenceStatus(userId): PresenceStatus
  → redis.get("presence:{userId}")
  → Parse JSON or return { status: "offline", lastSeen: "1970-01-01T00:00:00.000Z" }
```

Presence is enriched in two places:
- `users.profile` — single user lookup
- `users.search` — each search result (via `Promise.all`)

See [presence-and-typing.md](presence-and-typing.md) for the full presence lifecycle (heartbeats, SSE connect/disconnect).

## Client Components

### ProfileDialog (`apps/web/src/components/users/profile-dialog.tsx`)

View another user's profile. Queries `users.profile` when opened. Displays avatar, name, username, presence status, and public/private indicator. Includes "Send message" action to create a DM.

### EditProfileDialog

Edit own profile. Integrates:
- Avatar upload with preview
- Display name and username fields
- isPublic toggle ("Allow other people to find and message you")
- Notification channel radio group (web, telegram, both, none)
- Dark mode and sound toggles

On submit: calls `users.update` + `users.updateNotificationPreferences`, handles push subscription setup/teardown based on channel choice.

### Type Definitions (`apps/web/src/lib/trpc-types.ts`)

```typescript
type CurrentUser = RouterOutputs["users"]["me"]["user"];
type SearchUser  = RouterOutputs["users"]["search"]["users"][number];
type ProfileUser = RouterOutputs["users"]["profile"]["user"];
```

All types inferred from server router outputs — no manual type definitions.
