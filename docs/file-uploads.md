# File Uploads

## Upload Flow

```
1. User selects files in MessageInput
   ──> Files added to pendingFiles state (useFileAttachments hook)

2. On send:
   For each file:
     a. Web ──trpc──> uploads.getPresignedUrl({ filename, contentType, size })
        Server validates:
          - contentType in ALLOWED_CONTENT_TYPES (images, video, audio, docs — no SVG)
          - size <= 10 MB (MAX_FILE_SIZE)
        Server returns: { uploadUrl (presigned S3/R2), publicUrl, key }
        Presigned URL is signed with ContentLength and ContentDisposition

     b. Web ──PUT──> uploadUrl (direct to Cloudflare R2)
        R2 enforces exact Content-Length (signed in presigned URL)
        With progress tracking (XHR onprogress)

3. After all uploads complete:
   Web ──trpc──> messages.send({
     conversationId,
     content,
     attachments: [{ url: publicUrl, name, type, size, width?, height? }]
   })
   Server validates each attachment:
     - url must start with R2_PUBLIC_URL
     - type must be in ALLOWED_CONTENT_TYPES
     - size must be <= MAX_FILE_SIZE
```

## R2 Key Format

```
uploads/{userId}/{nanoid(12)}/{sanitizedFilename}
```

Sanitization: non-alphanumeric characters (except `.`, `_`, `-`) replaced with `_`.

## Attachment Schema

```typescript
type Attachment = {
  url: string;      // public R2 URL
  name: string;     // original filename
  type: string;     // MIME type
  size: number;     // bytes
  width?: number;   // for images
  height?: number;  // for images
};
```

Stored as JSONB array in the `messages.attachments` column.

## Security

- **ContentLength enforcement**: Presigned URLs include the exact file size in the signature. R2 rejects uploads whose `Content-Length` doesn't match.
- **ContentDisposition**: Images are served `inline`; all other types (pdf, doc, etc.) are served as `attachment` to prevent inline script execution.
- **URL domain restriction**: Attachment URLs in `messages.send` and avatar URLs in `users.update` must start with `R2_PUBLIC_URL`. Enforced via `getEnvOrThrow` (never falls back to empty string).
- **Metadata cross-validation**: Attachment `type` and `size` in `messages.send` are validated against `ALLOWED_CONTENT_TYPES` and `MAX_FILE_SIZE` so clients cannot spoof stored metadata.
- **No SVG**: `image/svg+xml` is excluded from allowed types to prevent stored XSS via embedded `<script>` tags.

## Allowed Content Types

| Category   | Types                                              |
|------------|----------------------------------------------------|
| Images     | jpeg, png, gif, webp                               |
| Video      | mp4, webm                                          |
| Audio      | mpeg, ogg, wav                                     |
| Documents  | pdf, doc, docx, xls, xlsx, txt                     |

## Key Files

- Upload constants (shared): `apps/server/src/lib/upload-constants.ts`
- Presigned URL generation: `apps/server/src/lib/r2.ts`
- Upload router (validation): `apps/server/src/trpc/routers/uploads.ts`
- Client upload with progress: `apps/web/src/lib/upload.ts`
- File attachment hook: `apps/web/src/components/chat/message-input/hooks/useFileAttachments.ts`
