import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { users, and, eq, ilike, or } from "@newchat/db";
import { getPresenceStatus } from "../../lib/presence";
import { router, protectedProcedure } from "../init";

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId!),
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return { user };
  }),
  update: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(32),
        displayName: z.string().min(1).max(80),
        avatar: z.string().max(2048).optional(),
        isPublic: z.boolean().optional().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({
          username: input.username,
          firstName: input.displayName,
          avatarUrl: input.avatar ?? null,
          isPublic: input.isPublic ?? true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.userId!))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return { user: updated };
    }),
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(25).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 10;
      const term = `%${input.query}%`;
      const rows = await ctx.db
        .select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
          isPublic: users.isPublic,
        })
        .from(users)
        .where(
          and(
            eq(users.isPublic, true),
            or(
              ilike(users.username, term),
              ilike(users.firstName, term),
              ilike(users.lastName, term),
            ),
          ),
        )
        .limit(limit);

      const enriched = await Promise.all(
        rows.map(async (user) => ({
          ...user,
          presence: await getPresenceStatus(user.id),
        })),
      );

      return { users: enriched };
    }),
  profile: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      if (!user.isPublic && user.id !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const presence = await getPresenceStatus(user.id);
      return { user: { ...user, presence } };
    }),
  presence: protectedProcedure
    .input(z.object({ userIds: z.array(z.number().int().positive()) }))
    .query(async ({ input }) => {
      const entries = await Promise.all(
        input.userIds.map(async (id) => ({
          userId: id,
          presence: await getPresenceStatus(id),
        })),
      );
      return { entries };
    }),
  updateNotificationPreferences: protectedProcedure
    .input(
      z.object({
        channel: z.enum(["web", "telegram", "both", "none"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({
          notificationChannel: input.channel,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.userId!))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return { user: updated };
    }),
});
