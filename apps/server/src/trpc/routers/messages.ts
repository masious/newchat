import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  users,
  conversationMembers,
  messages,
  readReceipts,
  and,
  desc,
  eq,
  inArray,
  lt,
} from "@newchat/db";
import { router, protectedProcedure } from "../init";
import { notifyUserOfMessage } from "../../services/notification-service";
import { fetchMessageWithSender } from "../../services/fetch-message";
import { publishConversationEvent } from "../../services/realtime-events";
import { ensureConversationMember } from "./helpers";
import { getEnvOrThrow } from "../../lib/r2";
import { ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE } from "../../lib/upload-constants";

const R2_PUBLIC_URL = getEnvOrThrow("R2_PUBLIC_URL");

export const messagesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        conversationId: z.number().int().positive(),
        cursor: z.number().int().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await ensureConversationMember(ctx.db, input.conversationId, ctx.userId!);

      const limit = input.limit ?? 25;
      const conditions = [
        eq(messages.conversationId, input.conversationId),
      ];
      if (input.cursor) {
        conditions.push(lt(messages.id, input.cursor));
      }
      const whereClause =
        conditions.length > 1 ? and(...conditions) : conditions[0];

      const rows = await ctx.db
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          content: messages.content,
          attachments: messages.attachments,
          createdAt: messages.createdAt,
          sender: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.senderId))
        .where(whereClause)
        .orderBy(desc(messages.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, -1) : rows;
      const nextCursor =
        hasMore && items.length ? items[items.length - 1].id : undefined;

      return {
        messages: items,
        nextCursor,
      };
    }),
  send: protectedProcedure
    .input(
      z.object({
        conversationId: z.number().int().positive(),
        content: z.string().max(10_000).default(""),
        attachments: z
          .array(
            z.object({
              url: z.string().url().max(2048).refine(
                (url) => url.startsWith(R2_PUBLIC_URL),
                { message: "Attachment URL must point to the upload storage" },
              ),
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
      const conversation = await ensureConversationMember(ctx.db, input.conversationId, ctx.userId!);

      const [created] = await ctx.db
        .insert(messages)
        .values({
          conversationId: input.conversationId,
          senderId: ctx.userId!,
          content: input.content,
          attachments: input.attachments?.length ? input.attachments : null,
        })
        .returning({ id: messages.id });

      await ctx.db
        .insert(readReceipts)
        .values({
          messageId: created.id,
          userId: ctx.userId!,
          readAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [readReceipts.messageId, readReceipts.userId],
          set: { readAt: new Date() },
        });

      const message = await fetchMessageWithSender(ctx.db, created.id);
      if (message) {
        await publishConversationEvent(input.conversationId, {
          type: "new_message",
          conversationId: input.conversationId,
          message,
        });

        // Get conversation members to send notifications
        const members = await ctx.db
          .select({ userId: conversationMembers.userId })
          .from(conversationMembers)
          .where(eq(conversationMembers.conversationId, input.conversationId));

        // Send notifications to all members except the sender
        const notificationPromises = members
          .filter((m) => m.userId !== ctx.userId)
          .map((member) =>
            notifyUserOfMessage(ctx.db, {
              recipientUserId: member.userId,
              senderName: message.sender!.firstName,
              content: input.content || "[Attachment]",
              conversationId: input.conversationId,
              conversationName: conversation.type === "group" ? conversation.name ?? undefined : undefined,
            })
          );

        // Send notifications in background (don't await)
        Promise.allSettled(notificationPromises).catch(console.error);
      }

      return { message };
    }),
  markRead: protectedProcedure
    .input(
      z.object({
        conversationId: z.number().int().positive(),
        messageIds: z.array(z.number().int().positive()).min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ensureConversationMember(ctx.db, input.conversationId, ctx.userId!);

      const validMessages = await ctx.db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            inArray(messages.id, input.messageIds),
            eq(messages.conversationId, input.conversationId),
          ),
        );
      if (validMessages.length !== input.messageIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid messageIds" });
      }

      const now = new Date();
      await ctx.db
        .insert(readReceipts)
        .values(
          input.messageIds.map((messageId) => ({
            messageId,
            userId: ctx.userId!,
            readAt: now,
          })),
        )
        .onConflictDoUpdate({
          target: [readReceipts.messageId, readReceipts.userId],
          set: { readAt: now },
        });

      await publishConversationEvent(input.conversationId, {
        type: "message_read",
        conversationId: input.conversationId,
        messageIds: input.messageIds,
        userId: ctx.userId!,
      });

      return { success: true };
    }),
  typing: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ensureConversationMember(ctx.db, input.conversationId, ctx.userId!);
      await publishConversationEvent(input.conversationId, {
        type: "typing",
        conversationId: input.conversationId,
        userId: ctx.userId!,
      });
      return { success: true };
    }),
});
