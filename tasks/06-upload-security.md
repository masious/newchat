# Upload Security

**Priority:** Medium
**Status:** Todo

## Items

### 1. Enforce ContentLength on Presigned URLs — `apps/server/src/lib/r2.ts:32-37`

Server validates `input.size` but the presigned URL has no size enforcement. Client can report 1 byte then upload 1GB.

**Fix:**

```typescript
const command = new PutObjectCommand({
  Bucket: getEnvOrThrow("R2_BUCKET_NAME"),
  Key: key,
  ContentType: contentType,
  ContentLength: size, // Enforce exact size
});
```

The `size` parameter needs to be passed from the router to the `generatePresignedUploadUrl` function.

### 2. Remove SVG from Allowed Types — `apps/server/src/trpc/routers/uploads.ts:12`

SVGs can contain `<script>` tags. If served from R2 with `Content-Type: image/svg+xml`, it's stored XSS.

**Fix:** Remove `"image/svg+xml"` from `ALLOWED_CONTENT_TYPES`. If SVG support is needed later, sanitize server-side and serve with `Content-Disposition: attachment`.

### 3. Validate Attachment URLs Against R2 Domain — `apps/server/src/trpc/routers/messages.ts:72-84`

`url` is validated as a URL but not restricted to R2. Users can attach arbitrary external links or `data:` URIs.

**Fix:**

```typescript
const R2_PUBLIC_URL = getEnvOrThrow("R2_PUBLIC_URL");
// In the zod schema:
url: z.string().url().max(2048).refine(
  (url) => url.startsWith(R2_PUBLIC_URL),
  { message: "Attachment URL must point to the upload storage" }
),
```
