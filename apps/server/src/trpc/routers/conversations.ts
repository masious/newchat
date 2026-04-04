import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { conversations, conversationMembers } from "@newchat/db";
import { router, protectedProcedure } from "../init";
import { fetchConversationSummaries, fetchConversationSummary } from "../../services/fetch-conversation-summaries";
import { fetchConversationMembers } from "../../services/fetch-conversation-members";
import { publishMembershipChange } from "../../services/realtime-events";
import { ensureConversationMember, ensureUsersExist } from "./helpers";

export const conversationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const conversations = await fetchConversationSummaries(ctx.db, ctx.userId!);
    return { conversations };
  }),
  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["dm", "group"]),
        memberUserIds: z.array(z.number().int().positive()),
        name: z.string().min(1).max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!;
      const sanitizedMemberIds = input.memberUserIds.filter(
        (id) => id !== userId,
      );
      const memberIds = Array.from(
        new Set<number>([...sanitizedMemberIds, userId]),
      );

      await ensureUsersExist(ctx.db, memberIds);

      if (input.type === "dm") {
        if (memberIds.length !== 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "DM conversations must include exactly two members",
          });
        }
        const otherId = memberIds.find((id) => id !== userId)!;
        const existing = await ctx.db.execute<{ id: number }>(sql`
          SELECT c.id
          FROM conversations c
          JOIN conversation_members cm1
            ON cm1.conversation_id = c.id
           AND cm1.user_id = ${userId}
          JOIN conversation_members cm2
            ON cm2.conversation_id = c.id
           AND cm2.user_id = ${otherId}
          WHERE c.type = 'dm'
          GROUP BY c.id
          HAVING COUNT(*) = 2
          LIMIT 1
        `);
        if (existing.rows.length) {
          const conversation = await fetchConversationSummary(
            ctx.db,
            userId,
            existing.rows[0].id,
          );
          return { conversation };
        }
      } else if (!input.name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Group conversations require a name",
        });
      } else if (memberIds.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Groups must include at least two members",
        });
      }

      const conversationId = await ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(conversations)
          .values({
            type: input.type,
            name: input.type === "group" ? input.name ?? null : null,
          })
          .returning({ id: conversations.id });

        await tx
          .insert(conversationMembers)
          .values(
            memberIds.map((memberId) => ({
              conversationId: created.id,
              userId: memberId,
            })),
          );

        return created.id;
      });

      const currentSummary = await fetchConversationSummary(
        ctx.db,
        userId,
        conversationId,
      );
      if (!currentSummary) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Conversation summary unavailable",
        });
      }

      for (const memberId of memberIds) {
        const otherSummary =
          memberId === userId
            ? currentSummary
            : await fetchConversationSummary(ctx.db, memberId, conversationId);
        if (!otherSummary) continue;
        await publishMembershipChange(memberId, {
          type: "join",
          conversationId,
          conversation: otherSummary,
        });
      }

      return { conversation: currentSummary };
    }),
  members: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await ensureConversationMember(ctx.db, input.conversationId, ctx.userId!);
      const members = await fetchConversationMembers(ctx.db, input.conversationId);
      return { members };
    }),
});
