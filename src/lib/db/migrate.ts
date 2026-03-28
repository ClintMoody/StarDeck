import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";

export function runMigrations() {
  try {
    migrate(db, { migrationsFolder: "drizzle" });
  } catch (e: any) {
    // Ignore "already exists" errors from concurrent build processes
    const msg = e?.cause?.message || e?.message || '';
    if (!msg.includes('already exists') && !msg.includes('duplicate column')) {
      throw e;
    }
  }
}

// Run on import during server startup
runMigrations();
