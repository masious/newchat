import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { mapDomainError } from "../error-mapper";
import * as userService from "../../services/user-service";
import { getEnvOrThrow } from "../../lib/r2";

const R2_PUBLIC_URL = getEnvOrThrow("R2_PUBLIC_URL");

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await userService.getMe(ctx.db, ctx.userId!);
    } catch (err) {
      throw mapDomainError(err);
    }
  }),
  update: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
        displayName: z.string().min(1).max(80),
        avatar: z.string().url().max(2048)
          .refine(url => url.startsWith(R2_PUBLIC_URL), "Avatar must be hosted on our CDN")
          .optional(),
        isPublic: z.boolean().optional().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await userService.update(ctx.db, ctx.userId!, input);
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().int().min(1).max(25).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        return await userService.search(ctx.db, {
          ...input,
          excludeUserId: ctx.userId!,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
  profile: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        return await userService.getProfile(ctx.db, {
          targetUserId: input.userId,
          requesterId: ctx.userId!,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
  presence: protectedProcedure
    .input(z.object({ userIds: z.array(z.number().int().positive()).max(100) }))
    .query(async ({ input }) => {
      try {
        return await userService.getPresenceBatch(input.userIds);
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
  updateNotificationPreferences: protectedProcedure
    .input(
      z.object({
        channel: z.enum(["web", "telegram", "both", "none"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await userService.updateNotificationPreferences(
          ctx.db,
          ctx.userId!,
          input.channel,
        );
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
});
