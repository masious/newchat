import { type Database } from "@newchat/db";
import {
  sendPushNotification,
  type PushPayload,
} from "../lib/web-push";
import { sendTelegramNotification } from "../lib/telegram-notifier";
import { findUserById } from "../data/user-queries";
import {
  findUserPushSubscriptions,
  deletePushSubscriptionById,
} from "../data/push-queries";

export interface NotificationPayload {
  recipientUserId: number;
  senderName: string;
  content: string;
  conversationId: number;
  conversationName?: string;
}

export async function notifyUserOfMessage(db: Database, payload: NotificationPayload) {
  const user = await findUserById(db, payload.recipientUserId);
  if (!user) {
    return;
  }

  if (user.notificationChannel === "none") {
    return;
  }

  const promises: Promise<any>[] = [];

  if (user.notificationChannel === "web" || user.notificationChannel === "both") {
    promises.push(sendWebPushNotifications(db, payload));
  }

  if (user.notificationChannel === "telegram" || user.notificationChannel === "both") {
    promises.push(
      sendTelegramNotification(user.telegramId, {
        senderName: payload.senderName,
        content: payload.content,
        conversationId: payload.conversationId,
        conversationName: payload.conversationName,
      }),
    );
  }

  await Promise.allSettled(promises);
}

async function sendWebPushNotifications(db: Database, payload: NotificationPayload) {
  const subs = await findUserPushSubscriptions(db, payload.recipientUserId);

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
  };

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
        pushPayload,
      ).catch((error) => {
        console.error("Error sending push notification:", error);
        return { success: false, expired: false };
      });

      if (result.expired) {
        await deletePushSubscriptionById(db, sub.id);
      }

      return result;
    }),
  );

  return results;
}
