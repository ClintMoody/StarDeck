import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestDb } from "../setup";
import { syncStarredRepos } from "@/lib/sync";
import { starredRepos, syncLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "@/lib/db/schema";

// Mock the GitHub client
vi.mock("@/lib/github", () => {
  return {
    GitHubClient: vi.fn().mockImplementation(() => ({
      rateLimit: { limit: 5000, remaining: 4990, reset: 1700000000 },
      getAllStarredRepos: vi.fn().mockResolvedValue([
        {
          starred_at: "2024-01-15T10:00:00Z",
          repo: {
            id: 12345,
            name: "superpowers",
            full_name: "obra/superpowers",
            owner: { login: "obra" },
            description: "Claude Code skills",
            homepage: "https://github.com/obra/superpowers",
            language: "TypeScript",
            topics: ["cli", "ai"],
            stargazers_count: 100,
            forks_count: 10,
            open_issues_count: 5,
            archived: false,
            disabled: false,
            pushed_at: "2024-03-20T12:00:00Z",
            html_url: "https://github.com/obra/superpowers",
          },
        },
        {
          starred_at: "2024-02-20T15:00:00Z",
          repo: {
            id: 67890,
            name: "ollama",
            full_name: "ollama/ollama",
            owner: { login: "ollama" },
            description: "Get up and running with large language models",
            homepage: "https://ollama.com",
            language: "Go",
            topics: ["ai", "llm"],
            stargazers_count: 78000,
            forks_count: 5000,
            open_issues_count: 200,
            archived: false,
            disabled: false,
            pushed_at: "2024-03-25T08:00:00Z",
            html_url: "https://github.com/ollama/ollama",
          },
        },
      ]),
    })),
  };
});

describe("syncStarredRepos", () => {
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

  it("inserts new starred repos into the database", async () => {
    const result = await syncStarredRepos(db, "test-token");

    const repos = db.select().from(starredRepos).all();
    expect(repos).toHaveLength(2);

    const superpowers = repos.find((r) => r.name === "superpowers");
    expect(superpowers).toBeDefined();
    expect(superpowers!.owner).toBe("obra");
    expect(superpowers!.language).toBe("TypeScript");
    expect(superpowers!.starCount).toBe(100);
    expect(JSON.parse(superpowers!.topics!)).toEqual(["cli", "ai"]);

    expect(result.added).toBe(2);
    expect(result.updated).toBe(0);
  });

  it("updates existing repos on re-sync", async () => {
    await syncStarredRepos(db, "test-token");
    const result = await syncStarredRepos(db, "test-token");

    const repos = db.select().from(starredRepos).all();
    expect(repos).toHaveLength(2);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(2);
  });

  it("marks unstarred repos", async () => {
    db.insert(starredRepos)
      .values({
        githubId: 99999,
        owner: "old",
        name: "unstarred-repo",
        fullName: "old/unstarred-repo",
        unstarred: false,
      })
      .run();

    await syncStarredRepos(db, "test-token");

    const unstarred = db
      .select()
      .from(starredRepos)
      .where(eq(starredRepos.githubId, 99999))
      .get();

    expect(unstarred!.unstarred).toBe(true);
  });

  it("logs the sync to sync_log", async () => {
    await syncStarredRepos(db, "test-token");

    const logs = db.select().from(syncLog).all();
    expect(logs).toHaveLength(1);
    expect(logs[0].syncType).toBe("full");
    expect(logs[0].status).toBe("success");
  });
});
