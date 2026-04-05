import type { Database } from "@newchat/db";
import {
  findPushSubscription,
  updatePushSubscriptionKeys,
  insertPushSubscription,
  deleteUserSubscriptions,
  deleteSubscriptionByEndpoint,
} from "../data/push-queries";

export async function subscribe(
  db: Database,
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  const existing = await findPushSubscription(
    db,
    userId,
    subscription.endpoint,
  );

  if (existing) {
    await updatePushSubscriptionKeys(db, existing.id, subscription.keys);
    return { success: true, subscriptionId: existing.id };
  }

  const created = await insertPushSubscription(db, {
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
  return { success: true, subscriptionId: created.id };
}

export async function unsubscribe(db: Database, userId: number) {
  await deleteUserSubscriptions(db, userId);
  return { success: true };
}

export async function unsubscribeEndpoint(
  db: Database,
  userId: number,
  endpoint: string,
) {
  await deleteSubscriptionByEndpoint(db, userId, endpoint);
  return { success: true };
}
