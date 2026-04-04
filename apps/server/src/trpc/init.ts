import { initTRPC, TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { createDb, type Database } from "@newchat/db";

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

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "JWT secret missing" });
  }

  try {
    const payload = jwt.verify(ctx.token, jwtSecret) as { userId: number };
    return next({ ctx: { ...ctx, userId: payload.userId } });
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
});

export const protectedProcedure = t.procedure.use(enforceUser);
