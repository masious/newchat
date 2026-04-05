# Upload Security

**Priority:** Medium
**Status:** Done

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

### 4. Fix `R2_PUBLIC_URL` Empty-String Fallback — `apps/server/src/trpc/routers/users.ts:7`

Avatar URL validation uses `process.env.R2_PUBLIC_URL ?? ""`. If the env var is unset, every URL passes `"".startsWith("")` — the refine check becomes a no-op.

**Fix:** Replace with `getEnvOrThrow` to match the pattern used in `r2.ts` and the new attachment validation:

```typescript
import { getEnvOrThrow } from "../../lib/r2"; // export the helper, or inline
const R2_PUBLIC_URL = getEnvOrThrow("R2_PUBLIC_URL");
```

This also affects item 3 — both call sites must use the same non-empty source of truth.

### 5. Set `Content-Disposition` on Non-Image Uploads — `apps/server/src/lib/r2.ts:32-37`

Allowed types like `application/pdf` can contain embedded JavaScript. R2 serves them inline by default, which means a PDF opened in-browser could execute scripts in the context of the R2 domain.

**Fix:** Add `ContentDisposition` to the `PutObjectCommand` (alongside the `ContentLength` fix in item 1):

```typescript
const command = new PutObjectCommand({
  Bucket: getEnvOrThrow("R2_BUCKET_NAME"),
  Key: key,
  ContentType: contentType,
  ContentLength: size,
  ContentDisposition: contentType.startsWith("image/") ? "inline" : "attachment",
});
```

### 6. Cross-Validate Attachment Metadata in `messages.send` — `apps/server/src/trpc/routers/messages.ts:79-83`

Attachment `type` and `size` fields are accepted as-is from the client. A malicious client can report `type: "application/x-executable"` or `size: 0` for a 10MB file. The actual R2 object is constrained by the presigned URL, but the stored metadata (shown to other users) is whatever the client claims.

**Fix:** Validate against the same constants used by the upload router:

```typescript
type: z.string().max(127).refine(
  (t) => ALLOWED_CONTENT_TYPES.has(t),
  { message: "Content type not allowed" }
),
size: z.number().int().nonnegative().max(MAX_FILE_SIZE),
```

`ALLOWED_CONTENT_TYPES` and `MAX_FILE_SIZE` should be extracted to a shared location (e.g. `apps/server/src/lib/upload-constants.ts`) so both routers reference the same values.
