import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { router, protectedProcedure } from "../init";
import { getPresignedUploadUrl, getPublicUrl } from "../../lib/r2";
import { ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE } from "../../lib/upload-constants";

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
      if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Content type "${input.contentType}" is not allowed`,
        });
      }
      if (input.size > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        });
      }

      const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `uploads/${ctx.userId}/${nanoid(12)}/${safeFilename}`;

      const uploadUrl = await getPresignedUploadUrl(key, input.contentType, input.size);
      const publicUrl = getPublicUrl(key);

      return { uploadUrl, publicUrl, key };
    }),
});
