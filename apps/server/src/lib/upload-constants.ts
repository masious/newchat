import { z } from "zod";
import { R2_PUBLIC_URL } from "./r2";

export const r2UrlSchema = z.string().url().max(2048).refine(
  (url) => url.startsWith(R2_PUBLIC_URL),
  { message: "URL must point to the upload storage" },
);

export const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
