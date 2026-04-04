import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { authTokens } from "@newchat/db";
import { router, publicProcedure } from "../init";

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
      const record = await ctx.db.query.authTokens.findFirst({
        where: eq(authTokens.token, input.token),
      });

      if (!record || record.status !== "confirmed" || !record.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token is not confirmed" });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "JWT secret missing" });
      }

      const signedToken = jwt.sign({ userId: record.userId }, jwtSecret, {
        expiresIn: "7d",
      });

      await ctx.db
        .update(authTokens)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(authTokens.id, record.id));

      return { token: signedToken };
    }),
});
