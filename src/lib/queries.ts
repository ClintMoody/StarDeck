import { db } from "@/lib/db";
import { starredRepos, tags, repoTags, syncLog, releases, securityAdvisories, repoNotes } from "@/lib/db/schema";
import { eq, desc, like, or, and, count, sql, inArray } from "drizzle-orm";
import "@/lib/db/migrate";

export interface RepoFilters {
  search?: string;
  language?: string;
  category?: string;
  tagId?: number;
  status?: "all" | "starred" | "cloned" | "running" | "updates";
  sort?: "starred" | "updated" | "stars" | "name";
}

export function getFilteredRepos(filters: RepoFilters = {}) {
  let query = db
    .select()
    .from(starredRepos)
    .where(eq(starredRepos.unstarred, false))
    .$dynamic();

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.where(
      or(
        like(starredRepos.fullName, term),
        like(starredRepos.description, term),
        like(starredRepos.language, term),
        like(starredRepos.topics, term)
      )
    );
  }

  if (filters.language) {
    query = query.where(eq(starredRepos.language, filters.language));
  }

  // Sort
  switch (filters.sort) {
    case "updated":
      query = query.orderBy(desc(starredRepos.lastCommitAt));
      break;
    case "stars":
      query = query.orderBy(desc(starredRepos.starCount));
      break;
    case "name":
      query = query.orderBy(starredRepos.fullName);
      break;
    case "starred":
    default:
      query = query.orderBy(desc(starredRepos.starredAt));
      break;
  }

  return query.all();
}

export function getReposByTag(tagId: number) {
  return db
    .select({ repo: starredRepos })
    .from(starredRepos)
    .innerJoin(repoTags, eq(repoTags.repoId, starredRepos.id))
    .where(and(eq(repoTags.tagId, tagId), eq(starredRepos.unstarred, false)))
    .all()
    .map((row) => row.repo);
}

export function getAllTags() {
  return db.select().from(tags).orderBy(tags.name).all();
}

export function getLanguageCounts() {
  return db
    .select({
      language: starredRepos.language,
      count: count(),
    })
    .from(starredRepos)
    .where(and(eq(starredRepos.unstarred, false), sql`${starredRepos.language} IS NOT NULL`))
    .groupBy(starredRepos.language)
    .orderBy(desc(count()))
    .all();
}

export function getRepoStats() {
  const all = db
    .select({ count: count() })
    .from(starredRepos)
    .where(eq(starredRepos.unstarred, false))
    .get();

  return {
    total: all?.count ?? 0,
  };
}

export function getRecentActivity(limit: number = 20) {
  const recentReleases = db
    .select({
      type: sql<string>`'release'`.as("type"),
      repoId: releases.repoId,
      title: releases.name,
      detail: releases.version,
      date: releases.publishedAt,
    })
    .from(releases)
    .orderBy(desc(releases.publishedAt))
    .limit(limit)
    .all();

  const recentAdvisories = db
    .select({
      type: sql<string>`'security'`.as("type"),
      repoId: securityAdvisories.repoId,
      title: securityAdvisories.summary,
      detail: securityAdvisories.severity,
      date: securityAdvisories.publishedAt,
    })
    .from(securityAdvisories)
    .orderBy(desc(securityAdvisories.publishedAt))
    .limit(limit)
    .all();

  // Merge and sort by date
  const allActivity = [...recentReleases, ...recentAdvisories]
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);

  return allActivity;
}

export function getLastSyncTime() {
  const lastSync = db
    .select()
    .from(syncLog)
    .where(eq(syncLog.status, "success"))
    .orderBy(desc(syncLog.completedAt))
    .limit(1)
    .get();

  return lastSync?.completedAt ?? null;
}

export function getRepoNote(repoId: number) {
  return db
    .select()
    .from(repoNotes)
    .where(eq(repoNotes.repoId, repoId))
    .get();
}

export function upsertRepoNote(repoId: number, content: string) {
  const existing = getRepoNote(repoId);
  if (existing) {
    db.update(repoNotes)
      .set({ content, updatedAt: new Date().toISOString() })
      .where(eq(repoNotes.repoId, repoId))
      .run();
  } else {
    db.insert(repoNotes).values({ repoId, content }).run();
  }
}

export function getRepoByFullName(owner: string, name: string) {
  return db
    .select()
    .from(starredRepos)
    .where(eq(starredRepos.fullName, `${owner}/${name}`))
    .get();
}

export function getRepoReleases(repoId: number) {
  return db
    .select()
    .from(releases)
    .where(eq(releases.repoId, repoId))
    .orderBy(desc(releases.publishedAt))
    .all();
}
