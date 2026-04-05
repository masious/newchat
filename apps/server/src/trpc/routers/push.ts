import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { mapDomainError } from "../error-mapper";
import * as pushService from "../../services/push-service";

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
      try {
        return await pushService.subscribe(
          ctx.db,
          ctx.userId!,
          input.subscription,
        );
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
  unsubscribe: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      return await pushService.unsubscribe(ctx.db, ctx.userId!);
    } catch (err) {
      throw mapDomainError(err);
    }
  }),
  unsubscribeEndpoint: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await pushService.unsubscribeEndpoint(
          ctx.db,
          ctx.userId!,
          input.endpoint,
        );
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
});
