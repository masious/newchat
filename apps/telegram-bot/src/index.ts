import { Bot } from "grammy";
import { nanoid } from "nanoid";
import { createDb, authTokens, users } from "@newchat/db";
import { eq } from "drizzle-orm";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

const bot = new Bot(token);
const db = createDb();
const botUsername =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "newchatauthbot";

bot.command("start", async (ctx) => {
  const payload = ctx.match; // deep link payload = login token

  if (!payload) {
    const generatedToken = nanoid(32);
    await db.insert(authTokens).values({ token: generatedToken });
    const deepLink = `https://t.me/${botUsername}?start=${generatedToken}`;
    await ctx.reply(
      [
        "Welcome to NewChat! Use this link to confirm your login from the web app:",
        deepLink,
        "After confirming, return to the browser to finish signing in.",
      ].join("\n"),
    );
    return;
  }

  // Look up the pending auth token
  const [authToken] = await db
    .select()
    .from(authTokens)
    .where(eq(authTokens.token, payload))
    .limit(1);

  if (!authToken || authToken.status !== "pending") {
    await ctx.reply("This login link is invalid or has expired.");
    return;
  }

  const telegramId = String(ctx.from?.id);
  const firstName = ctx.from?.first_name ?? "User";
  const lastName = ctx.from?.last_name ?? null;
  const username = ctx.from?.username ?? null;

  // Upsert user
  const [user] = await db
    .insert(users)
    .values({ telegramId, firstName, lastName, username })
    .onConflictDoUpdate({
      target: users.telegramId,
      set: { firstName, lastName, username, updatedAt: new Date() },
    })
    .returning();

  // Confirm the auth token
  await db
    .update(authTokens)
    .set({ status: "confirmed", telegramId, userId: user.id, updatedAt: new Date() })
    .where(eq(authTokens.id, authToken.id)).then(() => {
      console.log(`User ${user.id} authenticated via Telegram`);
    });

  await ctx.reply("You're signed in! You can now return to the web app.");
});

bot.start({
  onStart: (info) => {
    console.log(`Telegram bot @${info.username} is running`);
  },
});
