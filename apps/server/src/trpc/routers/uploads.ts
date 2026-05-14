import { z } from "zod";
import * as uploadService from "../../services/upload-service";
import { mapDomainError } from "../error-mapper";
import { protectedProcedure, router } from "../init";

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
