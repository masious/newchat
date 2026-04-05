import { z } from "zod";
import { router, publicProcedure } from "../init";
import { mapDomainError } from "../error-mapper";
import * as authService from "../../services/auth-service";

export const authRouter = router({
  createToken: publicProcedure.mutation(async ({ ctx }) => {
    try {
      return await authService.createToken(ctx.db);
    } catch (err) {
      throw mapDomainError(err);
    }
  }),
  pollToken: publicProcedure
    .input(z.object({ token: z.string().regex(/^[a-zA-Z0-9_-]{32}$/) }))
    .query(async ({ ctx, input }) => {
      try {
        return await authService.pollToken(ctx.db, input.token);
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
  exchange: publicProcedure
    .input(z.object({ token: z.string().regex(/^[a-zA-Z0-9_-]{32}$/) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await authService.exchange(ctx.db, input.token);
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
});
