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
    console.error("TELEGRAM_BOT_TOKEN not configured");
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
    ? `💬 *${safeSender}* in *${escapeMarkdown(payload.conversationName)}*:\n${safeContent}\n\n[Open in NewChat](${conversationUrl})`
    : `💬 *${safeSender}*:\n${safeContent}\n\n[Open in NewChat](${conversationUrl})`;

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

    const result = await response.json();

    if (!result.ok) {
      console.error("Telegram notification failed:", result);
      return { success: false, error: result.description };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return { success: false, error };
  }
}
