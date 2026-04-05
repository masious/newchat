import { type Database, pushSubscriptions, users, eq } from "@newchat/db";
import {
  sendPushNotification,
  type PushPayload,
} from "../lib/web-push";
import { sendTelegramNotification } from "../lib/telegram-notifier";

export interface NotificationPayload {
  recipientUserId: number;
  senderName: string;
  content: string;
  conversationId: number;
  conversationName?: string;
}

export async function notifyUserOfMessage(db: Database, payload: NotificationPayload) {
  // Get user's notification preferences and telegram ID
  const user = await db
    .select({
      notificationChannel: users.notificationChannel,
      telegramId: users.telegramId,
    })
    .from(users)
    .where(eq(users.id, payload.recipientUserId))
    .limit(1);

  if (!user.length) {
    return;
  }

  const { notificationChannel, telegramId } = user[0];

  // Skip if user disabled notifications
  if (notificationChannel === "none") {
    return;
  }

  const promises: Promise<any>[] = [];

  // Send Web Push notifications
  if (notificationChannel === "web" || notificationChannel === "both") {
    const webPushPromise = sendWebPushNotifications(db, payload);
    promises.push(webPushPromise);
  }

  // Send Telegram notifications
  if (notificationChannel === "telegram" || notificationChannel === "both") {
    const telegramPromise = sendTelegramNotification(telegramId, {
      senderName: payload.senderName,
      content: payload.content,
      conversationId: payload.conversationId,
      conversationName: payload.conversationName,
    });
    promises.push(telegramPromise);
  }

  // Send all notifications in parallel
  await Promise.allSettled(promises);
}

async function sendWebPushNotifications(db: Database, payload: NotificationPayload) {
  // Get all push subscriptions for this user
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, payload.recipientUserId));

  if (!subs.length) {
    return;
  }

  const webAppUrl = process.env.WEB_APP_URL || "http://localhost:3001";

  const pushPayload: PushPayload = {
    title: payload.conversationName
      ? `${payload.senderName} in ${payload.conversationName}`
      : payload.senderName,
    body: payload.content,
    conversationId: payload.conversationId,
    url: `${webAppUrl}/?conversation=${payload.conversationId}`,
    // icon: "/icon-192.png",
    // badge: "/badge-72.png",
  };

  // Send to all subscriptions
  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      const result = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        pushPayload
      ).catch((error) => {
        console.error("Error sending push notification:", error);
        return { success: false, expired: false };
      });

      // Remove expired subscriptions
      if (result.expired) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
      }

      return result;
    })
  );

  return results;
}
