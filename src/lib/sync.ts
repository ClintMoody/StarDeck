import { GitHubClient } from "@/lib/github";
import { runAutoSort } from "@/lib/categories";
import { starredRepos, repoLocalState, syncLog } from "@/lib/db/schema";
import { eq, notInArray, isNotNull } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "@/lib/db/schema";

interface SyncResult {
  added: number;
  updated: number;
  unstarred: number;
  errors: string[];
}

export async function syncStarredRepos(
  db: BetterSQLite3Database<typeof schema>,
  accessToken: string
): Promise<SyncResult> {
  const client = new GitHubClient(accessToken);
  const result: SyncResult = { added: 0, updated: 0, unstarred: 0, errors: [] };

  try {
    const starred = await client.getAllStarredRepos();
    const githubIds: number[] = [];

    for (const item of starred) {
      const { repo } = item;
      githubIds.push(repo.id);

      const existing = db
        .select()
        .from(starredRepos)
        .where(eq(starredRepos.githubId, repo.id))
        .get();

      const repoData = {
        githubId: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        homepageUrl: repo.homepage,
        language: repo.language,
        topics: JSON.stringify(repo.topics),
        starCount: repo.stargazers_count,
        forkCount: repo.forks_count,
        openIssuesCount: repo.open_issues_count,
        lastCommitAt: repo.pushed_at,
        archived: repo.archived,
        disabled: repo.disabled,
        unstarred: false,
        starredAt: item.starred_at,
        updatedAt: new Date().toISOString(),
      };

      if (existing) {
        db.update(starredRepos)
          .set(repoData)
          .where(eq(starredRepos.githubId, repo.id))
          .run();
        result.updated++;
      } else {
        db.insert(starredRepos).values(repoData).run();
        result.added++;
      }
    }

    // Mark repos that are no longer starred
    if (githubIds.length > 0) {
      const unmarked = db
        .update(starredRepos)
        .set({ unstarred: true, updatedAt: new Date().toISOString() })
        .where(notInArray(starredRepos.githubId, githubIds))
        .run();
      result.unstarred = unmarked.changes;
    }

    // Fetch latest remote SHA for repos that have a local clone
    const clonedRepos = db
      .select({ repoId: repoLocalState.repoId })
      .from(repoLocalState)
      .where(isNotNull(repoLocalState.clonePath))
      .all();

    const clonedRepoIds = new Set(clonedRepos.map(r => r.repoId));

    for (const item of starred) {
      const { repo } = item;
      if (!clonedRepoIds.size) break;

      const dbRepo = db
        .select({ id: starredRepos.id })
        .from(starredRepos)
        .where(eq(starredRepos.githubId, repo.id))
        .get();

      if (dbRepo && clonedRepoIds.has(dbRepo.id)) {
        try {
          const sha = await client.getLatestCommitSha(repo.owner.login, repo.name);
          if (sha) {
            db.update(starredRepos)
              .set({ latestRemoteSha: sha })
              .where(eq(starredRepos.id, dbRepo.id))
              .run();
          }
        } catch {
          // Skip on error — don't break sync for a single repo
        }
      }
    }

    // Run auto-sort to assign categories to new/updated repos
    try {
      runAutoSort();
    } catch {
      // Non-fatal — categories are a convenience feature
    }

    // Log the sync
    db.insert(syncLog)
      .values({
        syncType: "full",
        status: "success",
        apiCallsUsed: client.rateLimit
          ? client.rateLimit.limit - client.rateLimit.remaining
          : 0,
      })
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(message);

    db.insert(syncLog)
      .values({
        syncType: "full",
        status: error instanceof Error && message.includes("rate limit")
          ? "rate_limited"
          : "error",
        errorMessage: message,
      })
      .run();
  }

  return result;
}
