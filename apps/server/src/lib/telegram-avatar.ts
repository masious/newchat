import { uploadBuffer, getPublicUrl } from "./r2";
import { logger } from "./logger";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Fetches a user's Telegram profile photo and uploads it to R2.
 * Returns the R2 public URL, or null if the user has no profile photo.
 * Uses a deterministic R2 key so repeated calls overwrite the same file.
 */
export async function uploadTelegramAvatarToR2(
  telegramId: string,
): Promise<string | null> {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.error("TELEGRAM_BOT_TOKEN not configured");
    return null;
  }

  try {
    // Step 1: Get user profile photos
    const photosRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUserProfilePhotos?user_id=${telegramId}&limit=1`,
    );
    const photosData = (await photosRes.json()) as {
      ok: boolean;
      result?: { total_count: number; photos: Array<Array<{ file_id: string }>> };
    };

    if (!photosData.ok || !photosData.result?.total_count) {
      return null;
    }

    // Get the largest version of the first photo (last element = largest)
    const photoSizes = photosData.result.photos[0];
    const largestPhoto = photoSizes[photoSizes.length - 1];

    // Step 2: Get file path from Telegram
    const fileRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${largestPhoto.file_id}`,
    );
    const fileData = (await fileRes.json()) as {
      ok: boolean;
      result?: { file_path: string };
    };

    if (!fileData.ok || !fileData.result?.file_path) {
      return null;
    }

    // Step 3: Download the photo
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
    const imageRes = await fetch(downloadUrl);
    if (!imageRes.ok) return null;

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // Step 4: Upload to R2 with deterministic key (avoids duplicates on retry)
    const r2Key = `avatars/telegram/${telegramId}/photo.jpg`;
    await uploadBuffer(r2Key, imageBuffer, "image/jpeg");

    return getPublicUrl(r2Key);
  } catch (error) {
    logger.error({ error }, "Failed to fetch Telegram avatar");
    return null;
  }
}
