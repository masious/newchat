import { Bot } from "grammy";
import { nanoid } from "nanoid";
import { createDb, authTokens, users, eq, and } from "@newchat/db";
import { logger } from "./lib/logger";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

const bot = new Bot(token);
const db = createDb();
const botUsername =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "newchatauthbot";

bot.command("start", async (ctx) => {
  try {
    const payload = ctx.match; // deep link payload = login token

    if (payload && !/^[a-zA-Z0-9_-]{32}$/.test(payload)) {
      await ctx.reply("This login link is invalid or has expired.");
      return;
    }

    if (!payload) {
      const generatedToken = nanoid(32);
      await db.insert(authTokens).values({ token: generatedToken });
      const deepLink = `https://t.me/${botUsername}?start=${generatedToken}`;
      await ctx.reply(
        [
          "Welcome to Kite! Use this link to confirm your login from the web app:",
          deepLink,
          "After confirming, return to the browser to finish signing in.",
        ].join("\n"),
      );
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

    // Atomically confirm the auth token (prevents race condition)
    const [updated] = await db
      .update(authTokens)
      .set({ status: "confirmed", telegramId, userId: user.id, updatedAt: new Date() })
      .where(
        and(
          eq(authTokens.token, payload),
          eq(authTokens.status, "pending"),
        ),
      )
      .returning();

    if (!updated) {
      await ctx.reply("This login link is invalid or has expired.");
      return;
    }

    logger.info({ userId: user.id }, "User authenticated via Telegram");
    await ctx.reply("You're signed in! You can now return to the web app.");
  } catch (error) {
    logger.error({ error }, "Error handling /start command");
    await ctx.reply("Something went wrong. Please try again later.").catch(() => {});
  }
});

bot.start({
  onStart: (info) => {
    logger.info({ username: info.username }, "Telegram bot is running");
  },
});
