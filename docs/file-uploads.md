# File Uploads

## Upload Flow

```
1. User selects files in MessageInput
   ──> Files added to pendingFiles state (useFileAttachments hook)

2. On send:
   For each file:
     a. Web ──trpc──> uploads.getPresignedUrl({ filename, contentType, size })
        Server validates:
          - contentType in allowlist (images, video, audio, docs)
          - size <= 10 MB
        Server returns: { uploadUrl (presigned S3/R2), publicUrl, key }

     b. Web ──PUT──> uploadUrl (direct to Cloudflare R2)
        With progress tracking (XHR onprogress)

3. After all uploads complete:
   Web ──trpc──> messages.send({
     conversationId,
     content,
     attachments: [{ url: publicUrl, name, type, size, width?, height? }]
   })
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

## Allowed Content Types

| Category   | Types                                              |
|------------|----------------------------------------------------|
| Images     | jpeg, png, gif, webp, svg+xml                      |
| Video      | mp4, webm                                          |
| Audio      | mpeg, ogg, wav                                     |
| Documents  | pdf, doc, docx, xls, xlsx, txt                     |

## Key Files

- Presigned URL generation: `apps/server/src/lib/r2.ts`
- Upload router (validation): `apps/server/src/trpc/routers/uploads.ts`
- Client upload with progress: `apps/web/src/lib/upload.ts`
- File attachment hook: `apps/web/src/components/chat/message-input/hooks/useFileAttachments.ts`
