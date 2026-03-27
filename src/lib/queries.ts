import { db } from "@/lib/db";
import { starredRepos, tags, repoTags, syncLog, releases, securityAdvisories, repoNotes, repoLocalState, recipes, notifications, settings as settingsTable, collections, collectionRepos, scanDirectories, repoActivity, savedViews } from "@/lib/db/schema";
import { eq, desc, asc, like, or, and, count, sql, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import "@/lib/db/migrate";

export interface RepoFilters {
  search?: string;
  language?: string;
  category?: string;
  tagId?: number;
  status?: "all" | "starred" | "cloned" | "running" | "updates" | "archived";
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

export function getRepoLocalState(repoId: number) {
  return db
    .select()
    .from(repoLocalState)
    .where(eq(repoLocalState.repoId, repoId))
    .get();
}

export function upsertRepoLocalState(repoId: number, data: Partial<{
  clonePath: string;
  localVersion: string | null;
  localTag: string | null;
  processStatus: string;
  processPid: number | null;
  processPort: number | null;
  diskUsageBytes: number | null;
  lastPulledAt: string | null;
}>) {
  const existing = getRepoLocalState(repoId);
  if (existing) {
    db.update(repoLocalState)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(repoLocalState.repoId, repoId))
      .run();
  } else {
    db.insert(repoLocalState)
      .values({ repoId, ...data })
      .run();
  }
}

export function getRepoRecipe(repoId: number) {
  return db
    .select()
    .from(recipes)
    .where(eq(recipes.repoId, repoId))
    .get();
}

export function upsertRepoRecipe(repoId: number, data: {
  detectedType: string;
  installCommand: string | null;
  runCommand: string | null;
  envVars?: string;
  preHooks?: string;
  postHooks?: string;
  approved?: boolean;
}) {
  const existing = getRepoRecipe(repoId);
  if (existing) {
    db.update(recipes)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(recipes.repoId, repoId))
      .run();
  } else {
    db.insert(recipes)
      .values({ repoId, ...data })
      .run();
  }
}

export function getUnreadNotifications(limit: number = 50) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.read, false))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .all();
}

export function getAllNotifications(limit: number = 100) {
  return db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .all();
}

export function markNotificationRead(id: number) {
  db.update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, id))
    .run();
}

export function markAllNotificationsRead() {
  db.update(notifications)
    .set({ read: true })
    .where(eq(notifications.read, false))
    .run();
}

export function createNotification(data: {
  repoId?: number | null;
  type: string;
  title: string;
  message?: string;
}) {
  return db
    .insert(notifications)
    .values(data)
    .returning()
    .get();
}

export function getSetting(key: string): string | null {
  const row = db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, key))
    .get();
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  const existing = getSetting(key);
  if (existing !== null) {
    db.update(settingsTable)
      .set({ value })
      .where(eq(settingsTable.key, key))
      .run();
  } else {
    db.insert(settingsTable)
      .values({ key, value })
      .run();
  }
}

export function getAllSettings(): Record<string, string> {
  const rows = db.select().from(settingsTable).all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function getArchivedCount() {
  const result = db
    .select({ count: count() })
    .from(starredRepos)
    .where(eq(starredRepos.unstarred, true))
    .get();
  return result?.count ?? 0;
}

// ---- Mission Control Queries ----

export interface MissionControlFilters {
  stage?: string;
  search?: string;
  watchLevel?: string;
  collectionId?: number;
  localStatus?: string;
  sort?: string;
  tagId?: number;
}

export function getMissionControlRepos(filters: MissionControlFilters = {}) {
  let query = db.select({
    repo: starredRepos,
    localState: repoLocalState,
  })
  .from(starredRepos)
  .leftJoin(repoLocalState, eq(repoLocalState.repoId, starredRepos.id))
  .$dynamic();

  if (filters.stage) {
    query = query.where(eq(starredRepos.workflowStage, filters.stage));
  }
  if (filters.watchLevel) {
    query = query.where(eq(starredRepos.watchLevel, filters.watchLevel));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.where(
      or(
        like(starredRepos.fullName, term),
        like(starredRepos.description, term),
        like(starredRepos.topics, term),
      )!
    );
  }
  if (filters.collectionId) {
    const repoIds = db.select({ repoId: collectionRepos.repoId })
      .from(collectionRepos)
      .where(eq(collectionRepos.collectionId, filters.collectionId));
    query = query.where(inArray(starredRepos.id, repoIds));
  }
  if (filters.tagId) {
    const repoIds = db.select({ repoId: repoTags.repoId })
      .from(repoTags)
      .where(eq(repoTags.tagId, filters.tagId));
    query = query.where(inArray(starredRepos.id, repoIds));
  }

  // Sort
  switch (filters.sort) {
    case 'stars_desc':
      query = query.orderBy(desc(starredRepos.starCount));
      break;
    case 'name_asc':
      query = query.orderBy(starredRepos.fullName);
      break;
    case 'starred_desc':
      query = query.orderBy(desc(starredRepos.starredAt));
      break;
    case 'disk_desc':
      query = query.orderBy(desc(repoLocalState.diskUsageBytes));
      break;
    case 'activity_desc':
    default:
      query = query.orderBy(desc(starredRepos.lastCommitAt));
      break;
  }

  return query.all();
}

export function getStageCounts() {
  return db.select({
    stage: starredRepos.workflowStage,
    count: count(),
  })
  .from(starredRepos)
  .groupBy(starredRepos.workflowStage)
  .all();
}

export function updateWorkflowStage(repoIds: number[], stage: string) {
  return db.update(starredRepos)
    .set({ workflowStage: stage })
    .where(inArray(starredRepos.id, repoIds))
    .run();
}

export function updateWatchLevel(repoIds: number[], level: string) {
  return db.update(starredRepos)
    .set({ watchLevel: level })
    .where(inArray(starredRepos.id, repoIds))
    .run();
}

// ---- Collection Queries ----

export function getAllCollections() {
  return db.select().from(collections).all();
}

export function createCollection(name: string, color: string, autoRules?: string) {
  return db.insert(collections).values({ name, color, autoRules }).run();
}

export function updateCollection(id: number, data: { name?: string; color?: string; autoRules?: string }) {
  return db.update(collections).set(data).where(eq(collections.id, id)).run();
}

export function deleteCollection(id: number) {
  return db.delete(collections).where(eq(collections.id, id)).run();
}

export function getCollectionRepoIds(collectionId: number) {
  return db.select({ repoId: collectionRepos.repoId })
    .from(collectionRepos)
    .where(eq(collectionRepos.collectionId, collectionId))
    .all()
    .map(r => r.repoId);
}

export function addReposToCollection(collectionId: number, repoIds: number[]) {
  const values = repoIds.map(repoId => ({ collectionId, repoId }));
  return db.insert(collectionRepos).values(values).onConflictDoNothing().run();
}

export function removeRepoFromCollection(collectionId: number, repoId: number) {
  return db.delete(collectionRepos)
    .where(and(
      eq(collectionRepos.collectionId, collectionId),
      eq(collectionRepos.repoId, repoId),
    ))
    .run();
}

export function getCollectionCounts() {
  return db.select({
    collectionId: collectionRepos.collectionId,
    count: count(),
  })
  .from(collectionRepos)
  .groupBy(collectionRepos.collectionId)
  .all();
}

// ---- Scan Directory Queries ----

export function getAllScanDirectories() {
  return db.select().from(scanDirectories).all();
}

export function addScanDirectory(dirPath: string, recursive: boolean) {
  return db.insert(scanDirectories).values({ path: dirPath, recursive }).run();
}

export function removeScanDirectory(id: number) {
  return db.delete(scanDirectories).where(eq(scanDirectories.id, id)).run();
}

export function updateScanDirectoryTimestamp(id: number) {
  return db.update(scanDirectories)
    .set({ lastScannedAt: new Date().toISOString() })
    .where(eq(scanDirectories.id, id))
    .run();
}

// ---- Saved Views Queries ----

export function getAllSavedViews() {
  return db.select().from(savedViews).all();
}

export function createSavedView(name: string, filters: string) {
  return db.insert(savedViews).values({ name, filters }).run();
}

export function updateSavedView(id: number, data: { name?: string; filters?: string }) {
  return db.update(savedViews).set(data).where(eq(savedViews.id, id)).run();
}

export function deleteSavedView(id: number) {
  return db.delete(savedViews)
    .where(and(eq(savedViews.id, id), eq(savedViews.builtIn, false)))
    .run();
}

// ---- Repo Activity Queries ----

export function getRepoActivityFeed(repoId: number, limit = 50) {
  return db.select().from(repoActivity)
    .where(eq(repoActivity.repoId, repoId))
    .orderBy(desc(repoActivity.createdAt))
    .limit(limit)
    .all();
}

export function insertRepoActivity(repoId: number, type: string, summary: string, data?: string, externalUrl?: string) {
  return db.insert(repoActivity).values({ repoId, type, summary, data, externalUrl }).run();
}
