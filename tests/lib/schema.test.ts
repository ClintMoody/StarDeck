import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "../setup";
import { starredRepos, tags, repoTags, syncLog, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "@/lib/db/schema";

describe("database schema", () => {
  let db: BetterSQLite3Database<typeof schema>;
  let sqlite: Database.Database;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqlite = testDb.sqlite;
  });

  afterEach(() => {
    sqlite.close();
  });

  it("inserts and retrieves a starred repo", () => {
    const inserted = db
      .insert(starredRepos)
      .values({
        githubId: 12345,
        owner: "obra",
        name: "superpowers",
        fullName: "obra/superpowers",
        description: "Claude Code skills",
        language: "TypeScript",
        topics: JSON.stringify(["cli", "ai"]),
        starCount: 100,
        forkCount: 10,
        openIssuesCount: 5,
        starredAt: new Date().toISOString(),
      })
      .returning()
      .get();

    expect(inserted.owner).toBe("obra");
    expect(inserted.name).toBe("superpowers");

    const found = db
      .select()
      .from(starredRepos)
      .where(eq(starredRepos.githubId, 12345))
      .get();

    expect(found).toBeDefined();
    expect(found!.fullName).toBe("obra/superpowers");
  });

  it("enforces unique githubId on starred repos", () => {
    db.insert(starredRepos)
      .values({
        githubId: 99999,
        owner: "test",
        name: "repo",
        fullName: "test/repo",
      })
      .run();

    expect(() => {
      db.insert(starredRepos)
        .values({
          githubId: 99999,
          owner: "test",
          name: "repo-dupe",
          fullName: "test/repo-dupe",
        })
        .run();
    }).toThrow();
  });

  it("creates tags and links them to repos", () => {
    const repo = db
      .insert(starredRepos)
      .values({
        githubId: 11111,
        owner: "test",
        name: "tagged-repo",
        fullName: "test/tagged-repo",
      })
      .returning()
      .get();

    const tag = db
      .insert(tags)
      .values({ name: "audio", color: "#ff6600" })
      .returning()
      .get();

    db.insert(repoTags).values({ tagId: tag.id, repoId: repo.id }).run();

    const linked = db.select().from(repoTags).where(eq(repoTags.repoId, repo.id)).all();
    expect(linked).toHaveLength(1);
    expect(linked[0].tagId).toBe(tag.id);
  });

  it("stores and retrieves settings as key-value pairs", () => {
    db.insert(settings)
      .values({ key: "sync_interval_minutes", value: JSON.stringify(15) })
      .run();

    const setting = db
      .select()
      .from(settings)
      .where(eq(settings.key, "sync_interval_minutes"))
      .get();

    expect(setting).toBeDefined();
    expect(JSON.parse(setting!.value)).toBe(15);
  });
});
