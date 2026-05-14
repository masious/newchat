import { z } from "zod";
import { AUTH_TOKEN_PATTERN } from "../../lib/constants";
import * as authService from "../../services/auth-service";
import { mapDomainError } from "../error-mapper";
import { publicProcedure, router } from "../init";

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
