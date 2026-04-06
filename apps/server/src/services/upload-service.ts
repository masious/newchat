import { nanoid } from "nanoid";
import { BadRequestError } from "../errors";
import { getPresignedUploadUrl, getPublicUrl } from "../lib/r2";
import { ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE } from "../lib/upload-constants";

export async function getPresignedUrl(
  userId: number,
  input: { filename: string; contentType: string; size: number },
) {
  if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
    throw new BadRequestError(`Content type "${input.contentType}" is not allowed`);
  }
  if (input.size > MAX_FILE_SIZE) {
    throw new BadRequestError(
      `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `uploads/${userId}/${nanoid(12)}/${safeFilename}`;

  const uploadUrl = await getPresignedUploadUrl(key, input.contentType, input.size);
  const publicUrl = getPublicUrl(key);

  return { uploadUrl, publicUrl, key };
}
