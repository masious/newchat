import { z } from "zod";
import { router, publicProcedure } from "../init";
import { mapDomainError } from "../error-mapper";
import * as authService from "../../services/auth-service";
import { AUTH_TOKEN_PATTERN } from "../../lib/constants";

const authTokenSchema = z.string().regex(AUTH_TOKEN_PATTERN);

export const authRouter = router({
  createToken: publicProcedure.mutation(async ({ ctx }) => {
    try {
      return await authService.createToken(ctx.db);
    } catch (err) {
      throw mapDomainError(err);
    }
  }),
  pollToken: publicProcedure
    .input(z.object({ token: authTokenSchema }))
    .query(async ({ ctx, input }) => {
      try {
        return await authService.pollToken(ctx.db, input.token);
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
  exchange: publicProcedure
    .input(z.object({ token: authTokenSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await authService.exchange(ctx.db, input.token);
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
});
