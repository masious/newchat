import { initTRPC, TRPCError } from "@trpc/server";
import { createDb, type Database } from "@newchat/db";
import { verifyToken } from "../lib/jwt";

let _db: Database | undefined;
function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

type Context = {
  db: Database;
  token?: string;
  userId?: number;
};

export const createTRPCContext = (
  _opts: unknown,
  c: { req: { header: (name: string) => string | undefined } },
): Context => {
  const token = c.req.header("authorization")?.replace("Bearer ", "");
  return { db: getDb(), token };
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceUser = t.middleware(({ ctx, next }) => {
  if (!ctx.token) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const userId = verifyToken(ctx.token);
  if (userId === null) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId } });
});

export const protectedProcedure = t.procedure.use(enforceUser);
