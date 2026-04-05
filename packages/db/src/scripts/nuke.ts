import { createDb } from "../index";
import { sql } from "drizzle-orm";

if (!process.argv.includes("--confirm")) {
  console.error(
    "This will DROP all tables, enums, and data. Run with --confirm to proceed.",
  );
  process.exit(1);
}

const db = createDb();

async function nuke() {
  console.log("Dropping all tables and enums...");

  await db.execute(sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
      FOR r IN (SELECT typname FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid GROUP BY typname) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  console.log("Done. Database is empty.");
}

nuke()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Nuke failed:", err);
    process.exit(1);
  });
