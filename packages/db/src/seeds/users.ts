import { createDb } from "../index";
import {
  users,
  authTokens,
  pushSubscriptions,
  readReceipts,
  messages,
  conversationMembers,
  conversations,
} from "../schema";
import { sql } from "drizzle-orm";

const db = createDb();

async function seed() {
  console.log("Seeding users, auth tokens, and push subscriptions...");

  // Clear all tables (order matters for FK constraints)
  await db.delete(readReceipts);
  await db.delete(messages);
  await db.delete(conversationMembers);
  await db.delete(conversations);
  await db.delete(pushSubscriptions);
  await db.delete(authTokens);
  await db.delete(users);

  // Insert users with original IDs
  await db.execute(sql`
    INSERT INTO users (id, telegram_id, username, first_name, last_name, avatar_url, has_completed_onboarding, notification_channel, created_at, updated_at)
    OVERRIDING SYSTEM VALUE
    VALUES
      (15, '6673741438', 'm2bonabi', 'first masoud', NULL, 'https://masious.ir/uploads/15/PcO4Ne7_cl7H/nicki.jpeg', true, 'web', '2026-04-04T13:28:26.569Z', '2026-04-05T18:35:16.141Z'),
      (18, '8354540220', 'maseous', 'Masoud', 'Bonabi', NULL, true, 'web', '2026-04-05T12:36:40.122Z', '2026-04-05T14:49:18.574Z')
  `);

  // Reset the identity sequence to continue after the max ID
  await db.execute(
    sql`SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users))`,
  );

  // Insert auth tokens
  await db.execute(sql`
    INSERT INTO auth_tokens (id, token, telegram_id, status, user_id, created_at, updated_at)
    OVERRIDING SYSTEM VALUE
    VALUES
      (35, 'OVXdXeyqH4eXW6gbYbXahXBVLF-riLUO', '6673741438', 'expired', 15, '2026-04-04T13:28:10.479Z', '2026-04-04T13:28:28.660Z'),
      (36, '_kIukK8MEHCSalCGzOonT81ojDTzzVy-', '6673741438', 'expired', 15, '2026-04-04T13:28:29.442Z', '2026-04-04T13:28:51.877Z'),
      (37, 'D3FARKCOM1JEjTwMCsZXdOJSWKcg4aVY', NULL, 'expired', NULL, '2026-04-04T13:28:52.542Z', '2026-04-04T13:34:48.299Z'),
      (38, '6T2clGKbdXdmwauakH7WCsSxqi8Rxwtd', '6673741438', 'expired', 15, '2026-04-04T13:37:03.603Z', '2026-04-04T13:37:14.342Z'),
      (39, 'R20q2qd5W2rJ8e2TYVovF2FPWWUvIfJO', NULL, 'expired', NULL, '2026-04-04T13:37:03.614Z', '2026-04-04T13:42:48.308Z'),
      (40, 'ZJER0gGfhxeOm6Wt56PIs3yk-_WB7wp7', NULL, 'expired', NULL, '2026-04-04T13:37:13.333Z', '2026-04-04T13:42:48.308Z'),
      (41, '17l_xlwgljLalZsvZJUPKIp8iZsLuKrm', NULL, 'expired', NULL, '2026-04-04T13:37:13.338Z', '2026-04-04T13:42:48.308Z'),
      (42, 'XLo4cKpLiE8O0soqU_Ul4Cb1AEDl2KX8', NULL, 'expired', NULL, '2026-04-04T13:40:41.330Z', '2026-04-04T13:45:48.310Z'),
      (43, 'icuTVtdbrnT5_TAO2pqPQlSNtC9y0_PX', '8354540220', 'expired', 18, '2026-04-05T12:36:23.245Z', '2026-04-05T12:36:42.719Z'),
      (44, '5tPA8HcDChGBRn6guVkKJ8fhjKjsfOZt', NULL, 'expired', NULL, '2026-04-05T12:37:43.933Z', '2026-04-05T12:43:26.326Z'),
      (45, 'CIcn0n4xcsXDdILiNaerWCYzH7MGD79z', '6673741438', 'expired', 15, '2026-04-05T12:37:44.331Z', '2026-04-05T12:37:57.272Z'),
      (46, 'MCpDwhPf4j4BjpQaQZT7tcu_ZUr9tFBm', NULL, 'expired', NULL, '2026-04-05T12:37:56.148Z', '2026-04-05T12:43:26.326Z'),
      (47, 'gLKRxbsNYZcSW7QqA1oRH3xOswS-uyP-', '6673741438', 'expired', 15, '2026-04-05T12:37:56.549Z', '2026-04-05T12:38:20.261Z'),
      (48, 's-nDXNMaUoO3xmjQ2YXVIQAe0bh3oxbV', NULL, 'expired', NULL, '2026-04-05T12:38:19.189Z', '2026-04-05T12:43:26.326Z'),
      (49, 'uKYcP9568ovkxgFgON5BM9Zrk09GmBpn', NULL, 'expired', NULL, '2026-04-05T12:38:19.611Z', '2026-04-05T12:43:26.326Z'),
      (50, 'O3A8T5Y87cPBwGNihvSV8_JNzHs2_3aO', NULL, 'expired', NULL, '2026-04-05T12:38:27.246Z', '2026-04-05T12:43:38.706Z'),
      (51, 'CdS0dlyeCqqP2vNG28_PjDsjcugOZc_U', '6673741438', 'expired', 15, '2026-04-05T14:29:48.448Z', '2026-04-05T14:30:06.130Z'),
      (52, 'Q3nw0qrLs7RZ4s8mbGv8Tkwa49thLYJT', NULL, 'expired', NULL, '2026-04-05T14:30:06.259Z', '2026-04-05T14:35:07.780Z'),
      (53, '-KYY4y0oRnRSehBHpWtbP66-8Myw6ODc', NULL, 'expired', NULL, '2026-04-05T14:30:06.670Z', '2026-04-05T14:35:07.780Z'),
      (54, 'n9e1YX-4ommt6tY30HTM0oPvfQrMzCtq', '6673741438', 'expired', 15, '2026-04-05T14:30:13.862Z', '2026-04-05T14:30:20.140Z'),
      (55, 'ljYhCAgHsuM8uRt4ROh6lVc9PxX8L-64', NULL, 'expired', NULL, '2026-04-05T14:30:19.106Z', '2026-04-05T14:35:19.718Z'),
      (56, 'w4qifTxjC0xCxXGBqxMY0pvi_3PIdwcm', NULL, 'expired', NULL, '2026-04-05T14:30:19.504Z', '2026-04-05T14:35:19.718Z'),
      (57, '4FjKbxky2ewF0d8LBq3QyIifL04k9mgI', NULL, 'expired', NULL, '2026-04-05T14:30:28.571Z', '2026-04-05T14:35:30.277Z'),
      (58, 'yV_K92oF2iLGcLjkblbfHz8OAQ3UzsRX', '6673741438', 'expired', 15, '2026-04-05T14:48:33.579Z', '2026-04-05T14:48:49.143Z'),
      (59, 'bz2acGynoenMk04Lb9KcVk3ENCFSzNgR', NULL, 'expired', NULL, '2026-04-05T14:49:07.532Z', '2026-04-05T14:54:27.174Z'),
      (60, 'cbEqJr9bBu5aikHq2ZqFYexQYa7mK5sY', '8354540220', 'expired', 18, '2026-04-05T14:49:07.541Z', '2026-04-05T14:49:20.083Z')
  `);

  await db.execute(
    sql`SELECT setval(pg_get_serial_sequence('auth_tokens', 'id'), (SELECT MAX(id) FROM auth_tokens))`,
  );

  // Insert push subscriptions
  await db.execute(sql`
    INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
    OVERRIDING SYSTEM VALUE
    VALUES
      (7, 15, 'https://fcm.googleapis.com/fcm/send/eQuWZqFeIU0:APA91bHoZVxTRZVtk-2qLAPPppMrfXKm2nJ4Yzn8cQ-AAdCDpeObK-qeGbyoaxzD3lMJ-AxQorn30cRiTGz_WITK2auEqJh3nIHG4XluYsapzDXSylTHjvFTeX65t1emC1kVsTt2y37h', 'BLwryS19qlDqJJcMF2rcqmVCj_-D2s36Jw_TLWQRBZJ8bAWVt481znRJbvv9hlYReMIXwfonLJt50IpRDTpX07c', 'gNscwvWHUmw9kns08i9fKg', '2026-04-04T15:06:33.033Z'),
      (8, 18, 'https://web.push.apple.com/QNqLTudjr5ZBaGrk20rQ_D-_mi1ZWJZ92crOLE4e844xm40Yt_pPi_aGPJwtviVCtuW0r85z4CL5ID5hP564PTesukivpsNWW20wieXIc17OHSW1v-w3OhFp8wmQSvwZtaIcnwpcZCyDnM11cEd2Vgm4yzCmne-QGUVS8-vnpx0', 'BDdlcF8CTmI1FGChPTRys0yALMKkdDU41VBO7lrR2uaIsIXeOFtcF06zbF0TKnq1ac9kAJqinS2lyl2WKSfkQWo', 'fxtTy0pyDReeKAdbbe3E1Q', '2026-04-05T12:39:08.578Z'),
      (9, 15, 'https://fcm.googleapis.com/fcm/send/dk06-USrQvA:APA91bFaen3EHj-DsGvkthBYGRBkQt66JOr3OM4cssivP0S8Xsz9NYUzj-1KERruvsQbgtiWYWC616Z_dWT6OEEor6Ve-cf5lp2rKjJ-7VqZknbfQHfApjrMf93eSxSdT5Ws8_du-xKE', 'BIHWyZFHq1GSwKPTBBFVgDXnMwLvxM972e4l9ermqzLDvz3H98mZESXLuZwjtIxHCLaJ4bOhOjeJIOLp-kM0KhQ', '-SiaIymAnaFpWKsEo9LM1A', '2026-04-05T18:35:15.850Z')
  `);

  await db.execute(
    sql`SELECT setval(pg_get_serial_sequence('push_subscriptions', 'id'), (SELECT MAX(id) FROM push_subscriptions))`,
  );

  console.log("Done! Seeded 2 users, 26 auth tokens, and 3 push subscriptions.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
