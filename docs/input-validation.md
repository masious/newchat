# Input Validation

All tRPC inputs are validated with Zod schemas at the procedure boundary. Invalid input returns `BAD_REQUEST` before any business logic runs. Some additional checks happen in business logic after schema validation passes.

## Validation Layers

```
Request → Zod schema (shape, types, lengths, formats)
        → Business logic (authorization, existence checks, domain rules)
        → Database constraints (NOT NULL, UNIQUE, foreign keys, enums)
```

**Schema level** (Zod): Type safety, format constraints, length bounds. Rejects before procedure body executes.
**Business logic level**: Authorization (`ensureConversationMember`), existence checks (`ensureUsersExist`), domain rules (content type whitelist, file size cap, DM deduplication).
**Database level**: NOT NULL, UNIQUE constraints, foreign keys, enum types. Last line of defense.

---

## Message Content

**Procedure**: `messages.send` (`apps/server/src/trpc/routers/messages.ts`)

```typescript
content: z.string().max(10_000).default("")
attachments: z.array(attachmentSchema).max(10).optional()
// + refine: content.trim().length > 0 OR attachments.length > 0
```

| Rule | Constraint |
|------|-----------|
| Max content length | 10,000 characters |
| Default content | `""` (empty string) |
| Min requirement | Either non-empty trimmed content OR at least one attachment |
| Max attachments | 10 per message |

The `.refine()` cross-field check ensures you can't send a completely empty message (no text and no attachments).

---

## Attachment Validation

Each attachment object in the `attachments` array:

```typescript
z.object({
  url:    z.string().url().max(2048),         // valid URL, max 2048 chars
  name:   z.string().max(255),                // filename, max 255 chars
  type:   z.string().max(127),                // MIME type, max 127 chars
  size:   z.number().int().nonnegative(),     // bytes, non-negative integer
  width:  z.number().int().positive().optional(),  // image/video width
  height: z.number().int().positive().optional(),  // image/video height
})
```

**Note**: The attachment schema on `messages.send` does not whitelist content types — it accepts any `type` string. The content type whitelist is enforced separately at upload time (see below).

### Upload-Time Validation (Business Logic)

**Procedure**: `uploads.getPresignedUrl` (`apps/server/src/trpc/routers/uploads.ts`)

```typescript
filename:    z.string().min(1).max(255)
contentType: z.string().min(1).max(127)
size:        z.number().int().positive()
```

After schema validation, business logic enforces:

| Check | Rule |
|-------|------|
| Content type whitelist | 24 allowed MIME types (images, video, audio, PDF, Word, Excel, text) |
| File size limit | Max 10 MB |
| Filename sanitization | `filename.replace(/[^a-zA-Z0-9._-]/g, "_")` — strips special chars |

Disallowed content type → `BAD_REQUEST: Content type "{type}" is not allowed`
File too large → `BAD_REQUEST: File size exceeds maximum of 10MB`

---

## Username & Name Rules

### Username (`users.update`)

```typescript
username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/)
```

| Rule | Constraint |
|------|-----------|
| Min length | 3 characters |
| Max length | 32 characters |
| Allowed characters | `a-z`, `A-Z`, `0-9`, `_` (underscore) |
| Rejected | Spaces, special characters, unicode, emoji |

### Display Name (`users.update`)

```typescript
displayName: z.string().min(1).max(80)
```

| Rule | Constraint |
|------|-----------|
| Min length | 1 character |
| Max length | 80 characters |
| Allowed characters | Any (no format restriction) |

### Avatar URL (`users.update`)

```typescript
avatar: z.string().url().max(2048)
  .refine(url => url.startsWith(R2_PUBLIC_URL), "Avatar must be hosted on our CDN")
  .optional()
```

| Rule | Constraint |
|------|-----------|
| Format | Valid URL |
| Max length | 2048 characters |
| Domain restriction | Must start with `R2_PUBLIC_URL` environment variable |

This prevents users from setting arbitrary external URLs as avatars.

---

## Auth Token Validation

```typescript
token: z.string().regex(/^[a-zA-Z0-9_-]{32}$/)
```

Used in `auth.pollToken` and `auth.exchange`. Validates the nanoid format: exactly 32 characters, alphanumeric plus `-` and `_`. The Telegram bot applies the same regex check before querying the database.

---

## Conversation Creation

**Procedure**: `conversations.create`

```typescript
type:          z.enum(["dm", "group"])
memberUserIds: z.array(z.number().int().positive()).max(100)
name:          z.string().min(1).max(255).optional()
```

**Schema level**: Max 100 members, name between 1-255 chars.

**Business logic level**:
- DM: must have exactly 2 members (including self) → `BAD_REQUEST`
- Group: must have name → `BAD_REQUEST`
- Group: must have at least 2 members → `BAD_REQUEST`
- All member IDs must exist → `BAD_REQUEST` via `ensureUsersExist()`

---

## All Zod Constraints Summary

| Field | Min | Max | Format | Additional |
|-------|-----|-----|--------|-----------|
| Message content | 0 | 10,000 | — | Must have content or attachments |
| Attachment URL | — | 2,048 | `.url()` | — |
| Attachment name | — | 255 | — | — |
| Attachment type | — | 127 | — | Whitelist at upload time |
| Attachments array | — | 10 | — | Per message |
| Username | 3 | 32 | `/^[a-zA-Z0-9_]+$/` | — |
| Display name | 1 | 80 | — | — |
| Avatar URL | — | 2,048 | `.url()` | Must be R2 CDN domain |
| Conversation name | 1 | 255 | — | Required for groups |
| Member IDs array | — | 100 | Positive ints | — |
| Message IDs array | 1 | 100 | Positive ints | Must belong to conversation |
| Search query | 1 | 100 | — | Escaped for LIKE injection |
| Search limit | 1 | 25 | Int | Default 10 |
| Message list limit | 1 | 50 | Int | Default 25 |
| Auth token | — | — | `/^[a-zA-Z0-9_-]{32}$/` | Exact nanoid format |
| Notification channel | — | — | Enum | `web\|telegram\|both\|none` |
| Upload filename | 1 | 255 | — | Sanitized in business logic |
| Upload content type | 1 | 127 | — | Whitelisted in business logic |
| Upload file size | — | — | Positive int | Max 10MB in business logic |
| User IDs (presence) | — | 100 | Positive ints | — |

---

## Sanitization Functions

### SQL LIKE Escaping (`users.ts`)
```typescript
const escaped = input.query.replace(/[%_\\]/g, "\\$&");
```
Prevents wildcard injection in `users.search` ILIKE queries.

### Telegram Markdown Escaping (`telegram-notifier.ts`)
```typescript
function escapeMarkdown(text: string): string {
  return text.replace(/[*_[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}
```
Applied to sender name, conversation name, and content before sending Telegram notifications.

### Filename Sanitization (`uploads.ts`)
```typescript
const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
```
Strips special characters from filenames before generating R2 presigned URLs.
