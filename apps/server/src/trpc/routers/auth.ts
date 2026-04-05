import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { authTokens, eq, and } from "@newchat/db";
import { router, publicProcedure } from "../init";
import { signToken } from "../../lib/jwt";

const TOKEN_TTL_MS = 5 * 60 * 1000;

export const authRouter = router({
  createToken: publicProcedure.mutation(async ({ ctx }) => {
    const token = nanoid(32);
    await ctx.db.insert(authTokens).values({ token, status: "pending" });
    return {
      token,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    };
  }),
  pollToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.query.authTokens.findFirst({
        where: eq(authTokens.token, input.token),
        columns: { id: true, status: true, createdAt: true },
      });

      if (!record) {
        return { status: "expired" as const };
      }

      if (record.status === "pending") {
        const cutoff = Date.now() - TOKEN_TTL_MS;
        if (record.createdAt && record.createdAt.getTime() < cutoff) {
          await ctx.db
            .update(authTokens)
            .set({ status: "expired", updatedAt: new Date() })
            .where(eq(authTokens.id, record.id));
          return { status: "expired" as const };
        }
      }

      return { status: record.status };
    }),
  exchange: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [record] = await ctx.db
        .update(authTokens)
        .set({ status: "expired", updatedAt: new Date() })
        .where(
          and(
            eq(authTokens.token, input.token),
            eq(authTokens.status, "confirmed"),
          ),
        )
        .returning();

      if (!record || !record.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
      }

      return { token: signToken(record.userId) };
    }),
});
