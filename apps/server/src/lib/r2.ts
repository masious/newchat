import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable is not set: ${name}`);
  }
  return value;
}

// Validate at import time — server crashes on startup instead of
// leaking env var names in request-time error messages.
const R2_ACCOUNT_ID = getEnvOrThrow("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = getEnvOrThrow("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = getEnvOrThrow("R2_SECRET_ACCESS_KEY");
const R2_BUCKET_NAME = getEnvOrThrow("R2_BUCKET_NAME");
export const R2_PUBLIC_URL = getEnvOrThrow("R2_PUBLIC_URL");

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return _client;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  size: number,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
    ContentDisposition: contentType.startsWith("image/") ? "inline" : "attachment",
  });
  return getSignedUrl(getClient(), command, { expiresIn: 300 });
}

export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}
