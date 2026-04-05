import { type Database, pushSubscriptions, and, eq } from "@newchat/db";

export async function findPushSubscription(
  db: Database,
  userId: number,
  endpoint: string,
) {
  return db.query.pushSubscriptions.findFirst({
    where: and(
      eq(pushSubscriptions.userId, userId),
      eq(pushSubscriptions.endpoint, endpoint),
    ),
  });
}

export async function updatePushSubscriptionKeys(
  db: Database,
  subscriptionId: number,
  keys: { p256dh: string; auth: string },
) {
  await db
    .update(pushSubscriptions)
    .set({ p256dh: keys.p256dh, auth: keys.auth })
    .where(eq(pushSubscriptions.id, subscriptionId));
}

export async function insertPushSubscription(
  db: Database,
  input: { userId: number; endpoint: string; p256dh: string; auth: string },
) {
  const [created] = await db
    .insert(pushSubscriptions)
    .values(input)
    .returning({ id: pushSubscriptions.id });
  return created;
}

export async function deleteUserSubscriptions(
  db: Database,
  userId: number,
) {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

export async function deleteSubscriptionByEndpoint(
  db: Database,
  userId: number,
  endpoint: string,
) {
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    );
}

export async function findUserPushSubscriptions(
  db: Database,
  userId: number,
) {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

export async function deletePushSubscriptionById(
  db: Database,
  subscriptionId: number,
) {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.id, subscriptionId));
}
