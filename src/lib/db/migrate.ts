import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";

export function runMigrations() {
  try {
    migrate(db, { migrationsFolder: "drizzle" });
  } catch (e: any) {
    // Ignore "already exists" errors from concurrent build processes
    if (!e?.cause?.message?.includes('already exists')) {
      throw e;
    }
  }
}

// Run on import during server startup
runMigrations();
