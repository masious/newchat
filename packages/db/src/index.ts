import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(databaseUrl?: string) {
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = postgres(url);
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;
export * from "./schema";

export { eq, ne, and, or, lt, desc, asc, ilike, inArray, sql } from "drizzle-orm";
