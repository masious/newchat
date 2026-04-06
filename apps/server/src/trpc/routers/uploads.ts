import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { mapDomainError } from "../error-mapper";
import * as uploadService from "../../services/upload-service";

export const uploadsRouter = router({
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(255),
        contentType: z.string().min(1).max(127),
        size: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await uploadService.getPresignedUrl(ctx.userId!, input);
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
});
