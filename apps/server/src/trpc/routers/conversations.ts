import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { mapDomainError } from "../error-mapper";
import * as conversationService from "../../services/conversation-service";

export const conversationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await conversationService.list(ctx.db, { userId: ctx.userId! });
    } catch (err) {
      throw mapDomainError(err);
    }
  }),
  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["dm", "group"]),
        memberUserIds: z.array(z.number().int().positive()).max(100),
        name: z.string().min(1).max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await conversationService.create(ctx.db, {
          ...input,
          creatorId: ctx.userId!,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
  members: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        return await conversationService.getMembers(ctx.db, {
          ...input,
          userId: ctx.userId!,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
});
