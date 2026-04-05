import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export function createDb(databaseUrl?: string) {
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(url);
  return drizzle(url, { schema });
}

export type Database = ReturnType<typeof createDb>;
export * from "./schema";

export { eq, and, or, lt, desc, asc, ilike, inArray, sql } from "drizzle-orm";
