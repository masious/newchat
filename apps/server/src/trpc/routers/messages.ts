import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { mapDomainError } from "../error-mapper";
import * as messageService from "../../services/message-service";
import { ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE, r2UrlSchema } from "../../lib/upload-constants";
import { MESSAGES_MAX_LIMIT } from "../../lib/constants";

export const messagesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        conversationId: z.number().int().positive(),
        cursor: z.number().int().optional(),
        limit: z.number().int().min(1).max(MESSAGES_MAX_LIMIT).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        return await messageService.list(ctx.db, {
          ...input,
          senderId: ctx.userId!,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
  send: protectedProcedure
    .input(
      z.object({
        conversationId: z.number().int().positive(),
        content: z.string().max(10_000).default(""),
        attachments: z
          .array(
            z.object({
              url: r2UrlSchema,
              name: z.string().max(255),
              type: z.string().max(127).refine(
                (t) => ALLOWED_CONTENT_TYPES.has(t),
                { message: "Content type not allowed" },
              ),
              size: z.number().int().nonnegative().max(MAX_FILE_SIZE),
              width: z.number().int().positive().optional(),
              height: z.number().int().positive().optional(),
            }),
          )
          .max(10)
          .optional(),
      }).refine(
        (data) => data.content.trim().length > 0 || (data.attachments && data.attachments.length > 0),
        { message: "Message must have content or attachments" },
      ),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await messageService.send(ctx.db, {
          ...input,
          senderId: ctx.userId!,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
  markRead: protectedProcedure
    .input(
      z.object({
        conversationId: z.number().int().positive(),
        messageIds: z.array(z.number().int().positive()).min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await messageService.markRead(ctx.db, {
          ...input,
          userId: ctx.userId!,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
  typing: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await messageService.typing(ctx.db, {
          ...input,
          userId: ctx.userId!,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
});
