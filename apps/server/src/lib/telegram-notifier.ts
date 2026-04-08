import { logger } from "./logger";

function escapeMarkdown(text: string): string {
  return text.replace(/[*_[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

export interface TelegramNotificationPayload {
  senderName: string;
  content: string;
  conversationId: number;
  conversationName?: string;
}

export async function sendTelegramNotification(
  telegramId: string,
  payload: TelegramNotificationPayload
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error("TELEGRAM_BOT_TOKEN not configured");
    return { success: false };
  }

  const webAppUrl = process.env.WEB_APP_URL || "http://localhost:3001";
  const conversationUrl = `${webAppUrl}/?conversation=${payload.conversationId}`;

  // Truncate content if too long
  const content = payload.content.length > 100
    ? payload.content.substring(0, 100) + "..."
    : payload.content;

  const safeSender = escapeMarkdown(payload.senderName);
  const safeContent = escapeMarkdown(content);

  const text = payload.conversationName
    ? `💬 *${safeSender}* in *${escapeMarkdown(payload.conversationName)}*:\n${safeContent}\n\n[Open in Kite](${conversationUrl})`
    : `💬 *${safeSender}*:\n${safeContent}\n\n[Open in Kite](${conversationUrl})`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramId,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      }
    );

    const result = (await response.json()) as { ok: boolean; description?: string };

    if (!result.ok) {
      logger.error({ result }, "Telegram notification failed");
      return { success: false, error: result.description };
    }

    return { success: true };
  } catch (error) {
    logger.error({ error }, "Failed to send Telegram notification");
    return { success: false, error };
  }
}
