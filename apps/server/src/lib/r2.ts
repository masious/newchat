import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  const accountId = getEnvOrThrow("R2_ACCOUNT_ID");
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnvOrThrow("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnvOrThrow("R2_SECRET_ACCESS_KEY"),
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
    Bucket: getEnvOrThrow("R2_BUCKET_NAME"),
    Key: key,
    ContentType: contentType,
    ContentLength: size,
    ContentDisposition: contentType.startsWith("image/") ? "inline" : "attachment",
  });
  return getSignedUrl(getClient(), command, { expiresIn: 300 });
}

export function getPublicUrl(key: string): string {
  const publicUrl = getEnvOrThrow("R2_PUBLIC_URL");
  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}
