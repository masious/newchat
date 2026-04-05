import webpush from "web-push";
import { logger } from "./logger";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:notifications@newchat.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  logger.info("Web push configured with VAPID keys");
} else {
  logger.warn("VAPID keys not configured - web push notifications will be disabled");
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  conversationId?: number;
  url?: string;
  icon?: string;
  badge?: string;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      {
        TTL: 86400, // 24 hours
      }
    );
    return { success: true };
  } catch (error: any) {
    // Handle subscription expiration
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, expired: true };
    }
    logger.error({ error }, "Push notification failed");
    return { success: false, expired: false };
  }
}
