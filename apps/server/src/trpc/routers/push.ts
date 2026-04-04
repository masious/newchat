import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { pushSubscriptions } from "@newchat/db";
import { router, protectedProcedure } from "../init";

export const pushRouter = router({
  subscribe: protectedProcedure
    .input(
      z.object({
        subscription: z.object({
          endpoint: z.string().url(),
          keys: z.object({
            p256dh: z.string(),
            auth: z.string(),
          }),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if subscription already exists for this user + endpoint
      const existing = await ctx.db.query.pushSubscriptions.findFirst({
        where: and(
          eq(pushSubscriptions.userId, ctx.userId!),
          eq(pushSubscriptions.endpoint, input.subscription.endpoint),
        ),
      });

      if (existing) {
        // Update keys in case they rotated
        await ctx.db
          .update(pushSubscriptions)
          .set({
            p256dh: input.subscription.keys.p256dh,
            auth: input.subscription.keys.auth,
          })
          .where(eq(pushSubscriptions.id, existing.id));

        return { success: true, subscriptionId: existing.id };
      }

      // Create new subscription
      const [created] = await ctx.db
        .insert(pushSubscriptions)
        .values({
          userId: ctx.userId!,
          endpoint: input.subscription.endpoint,
          p256dh: input.subscription.keys.p256dh,
          auth: input.subscription.keys.auth,
        })
        .returning({ id: pushSubscriptions.id });

      return { success: true, subscriptionId: created.id };
    }),
  unsubscribe: protectedProcedure.mutation(async ({ ctx }) => {
    // Remove all push subscriptions for this user
    await ctx.db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, ctx.userId!));

    return { success: true };
  }),
  unsubscribeEndpoint: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Remove specific subscription by endpoint
      await ctx.db
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, ctx.userId!),
            eq(pushSubscriptions.endpoint, input.endpoint),
          ),
        );

      return { success: true };
    }),
});
