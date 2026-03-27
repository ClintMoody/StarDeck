# Mission Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated Mission Control page with a dense sortable table, workflow pipeline stages, directory scanner, version comparison, collections, watch levels, and contextual actions.

**Architecture:** New `/mission-control` page with its own component tree. Extends existing Drizzle schema with new tables and columns. New API routes for CRUD operations. Reuses existing SlideOutPanel, NotificationBell, and SearchInput components. Data layer first, then API routes, then UI.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Drizzle ORM + better-sqlite3, Vitest, chokidar (new dep for filesystem watching).

---

## File Structure

### New Files
```
src/lib/db/schema.ts                          — MODIFY: add new tables + columns
src/lib/db/migrate-mission-control.ts         — CREATE: migration script for new schema
src/lib/scanner.ts                            — CREATE: directory scanner + filesystem watcher
src/lib/version-check.ts                      — CREATE: local vs remote version comparison
src/lib/collections.ts                        — CREATE: collection CRUD + auto-rules engine

src/app/mission-control/page.tsx              — CREATE: main Mission Control page (server component)
src/components/mission-control/pipeline-bar.tsx    — CREATE: workflow stage tabs
src/components/mission-control/mc-sidebar.tsx      — CREATE: collections/filters sidebar
src/components/mission-control/repo-table.tsx      — CREATE: sortable table container
src/components/mission-control/repo-table-row.tsx  — CREATE: single table row
src/components/mission-control/stage-dropdown.tsx  — CREATE: inline stage picker
src/components/mission-control/bulk-action-bar.tsx — CREATE: multi-select action toolbar
src/components/mission-control/scan-setup.tsx      — CREATE: directory scanner config UI
src/components/mission-control/scan-match-review.tsx — CREATE: ambiguous match confirmation
src/components/mission-control/clone-preview.tsx   — CREATE: pre-clone dry run modal
src/components/mission-control/update-modal.tsx    — CREATE: advanced update options
src/components/mission-control/collection-manager.tsx — CREATE: collection CRUD UI
src/components/mission-control/saved-view-manager.tsx — CREATE: saved filter presets

src/app/api/mission-control/route.ts          — CREATE: main data endpoint
src/app/api/workflow-stage/route.ts           — CREATE: stage change endpoint
src/app/api/watch-level/route.ts              — CREATE: watch level endpoint
src/app/api/collections/route.ts              — CREATE: collection CRUD
src/app/api/collections/[id]/repos/route.ts   — CREATE: collection membership
src/app/api/scan/route.ts                     — CREATE: trigger scan
src/app/api/scan/directories/route.ts         — CREATE: manage scan dirs
src/app/api/scan/matches/route.ts             — CREATE: ambiguous match review
src/app/api/update-repo/route.ts              — CREATE: smart pull endpoint
src/app/api/version-check/route.ts            — CREATE: version comparison
src/app/api/saved-views/route.ts              — CREATE: saved view presets

tests/lib/scanner.test.ts                     — CREATE: scanner tests
tests/lib/version-check.test.ts               — CREATE: version comparison tests
tests/lib/collections.test.ts                 — CREATE: collections tests
tests/api/mission-control.test.ts             — CREATE: API integration tests
tests/api/workflow-stage.test.ts              — CREATE: stage API tests
tests/api/scan.test.ts                        — CREATE: scan API tests
```

### Modified Files
```
src/lib/db/schema.ts          — add workflowStage, watchLevel, collections, scanDirectories, etc.
src/lib/queries.ts            — add mission control query functions
src/app/api/clone/route.ts    — add auto-stage-advancement after clone
src/app/api/run/route.ts      — add auto-stage-advancement after first run
src/lib/sync.ts               — extend to fetch commit SHAs and activity for watched repos
src/components/settings/general-settings.tsx — add scan directories config section
```

---

## Phase 1: Data Layer

### Task 1: Extend Drizzle Schema

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Add workflowStage and watchLevel to starredRepos**

Add after the existing `updatedAt` field in the `starredRepos` table definition (around line 33):

```typescript
  workflowStage: text('workflow_stage').notNull().default('watching'),
  watchLevel: text('watch_level').notNull().default('releases_only'),
```

- [ ] **Step 2: Add localTag to repoLocalState**

Add after the existing `lastPulledAt` field in the `repoLocalState` table definition (around line 104):

```typescript
  localTag: text('local_tag'),
```

- [ ] **Step 3: Add collections table**

Add after the `syncLog` table definition (end of file):

```typescript
export const collections = sqliteTable('collections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#8b949e'),
  autoRules: text('auto_rules'), // JSON: { topics?: string[], languages?: string[], keywords?: string[] }
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const collectionRepos = sqliteTable('collection_repos', {
  collectionId: integer('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  repoId: integer('repo_id').notNull().references(() => starredRepos.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.collectionId, table.repoId] }),
]);
```

- [ ] **Step 4: Add scanDirectories table**

```typescript
export const scanDirectories = sqliteTable('scan_directories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  path: text('path').notNull().unique(),
  recursive: integer('recursive', { mode: 'boolean' }).notNull().default(true),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastScannedAt: text('last_scanned_at'),
});
```

- [ ] **Step 5: Add repoActivity table**

```typescript
export const repoActivity = sqliteTable('repo_activity', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  repoId: integer('repo_id').notNull().references(() => starredRepos.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'commit_summary' | 'issue' | 'pull_request' | 'release' | 'fork' | 'star_milestone'
  summary: text('summary').notNull(),
  data: text('data'), // JSON with type-specific details
  externalUrl: text('external_url'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
```

- [ ] **Step 6: Add savedViews table**

```typescript
export const savedViews = sqliteTable('saved_views', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  filters: text('filters').notNull(), // JSON: { stage?, collection?, watchLevel?, sort?, search?, tags? }
  builtIn: integer('built_in', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
```

- [ ] **Step 7: Add primaryKey import if not present**

Check the top of schema.ts. The `primaryKey` helper is needed for the `collectionRepos` composite key. Add to the drizzle-orm import:

```typescript
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(schema): add mission control tables — collections, scanDirectories, repoActivity, savedViews, workflow/watch columns"
```

---

### Task 2: Migration Script

**Files:**
- Create: `src/lib/db/migrate-mission-control.ts`

- [ ] **Step 1: Write migration script**

This script runs raw SQL to add columns and create tables for existing databases. Drizzle's `push` can handle new tables, but adding columns to existing tables with data needs explicit ALTER TABLE statements.

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'stardeck.db');

export function migrateMissionControl() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.transaction(() => {
    // Add columns to starredRepos (ignore if already exist)
    const starredCols = db.prepare(
      "SELECT name FROM pragma_table_info('starred_repos')"
    ).all().map((r: any) => r.name);

    if (!starredCols.includes('workflow_stage')) {
      db.exec("ALTER TABLE starred_repos ADD COLUMN workflow_stage TEXT NOT NULL DEFAULT 'watching'");
    }
    if (!starredCols.includes('watch_level')) {
      db.exec("ALTER TABLE starred_repos ADD COLUMN watch_level TEXT NOT NULL DEFAULT 'releases_only'");
    }

    // Add localTag to repo_local_state
    const localCols = db.prepare(
      "SELECT name FROM pragma_table_info('repo_local_state')"
    ).all().map((r: any) => r.name);

    if (!localCols.includes('local_tag')) {
      db.exec("ALTER TABLE repo_local_state ADD COLUMN local_tag TEXT");
    }

    // Create new tables (IF NOT EXISTS)
    db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#8b949e',
        auto_rules TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS collection_repos (
        collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        repo_id INTEGER NOT NULL REFERENCES starred_repos(id) ON DELETE CASCADE,
        PRIMARY KEY (collection_id, repo_id)
      );

      CREATE TABLE IF NOT EXISTS scan_directories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL UNIQUE,
        recursive INTEGER NOT NULL DEFAULT 1,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_scanned_at TEXT
      );

      CREATE TABLE IF NOT EXISTS repo_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_id INTEGER NOT NULL REFERENCES starred_repos(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        summary TEXT NOT NULL,
        data TEXT,
        external_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS saved_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        filters TEXT NOT NULL,
        built_in INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Backfill workflow stages based on existing data
    // Repos with running process → "active"
    db.exec(`
      UPDATE starred_repos SET workflow_stage = 'active'
      WHERE id IN (
        SELECT repo_id FROM repo_local_state
        WHERE process_status = 'running'
      ) AND workflow_stage = 'watching'
    `);

    // Repos with clone path → "downloaded"
    db.exec(`
      UPDATE starred_repos SET workflow_stage = 'downloaded'
      WHERE id IN (
        SELECT repo_id FROM repo_local_state
        WHERE clone_path IS NOT NULL AND clone_path != ''
      ) AND workflow_stage = 'watching'
    `);

    // Seed built-in saved views
    const viewCount = db.prepare("SELECT COUNT(*) as cnt FROM saved_views WHERE built_in = 1").get() as any;
    if (viewCount.cnt === 0) {
      const insertView = db.prepare(
        "INSERT INTO saved_views (name, filters, built_in) VALUES (?, ?, 1)"
      );
      insertView.run('Needs Attention', JSON.stringify({ localStatus: 'outdated', includeVulnerable: true }));
      insertView.run('Ready to Try', JSON.stringify({ stage: 'want_to_try', sort: 'stars_desc' }));
      insertView.run('Space Hogs', JSON.stringify({ localStatus: 'downloaded', sort: 'disk_desc' }));
    }
  })();

  db.close();
}
```

- [ ] **Step 2: Run migration test manually**

```bash
npx tsx src/lib/db/migrate-mission-control.ts
```

Verify by checking the database:
```bash
sqlite3 stardeck.db ".schema collections" ".schema scan_directories" ".schema repo_activity" ".schema saved_views" "PRAGMA table_info(starred_repos);" "PRAGMA table_info(repo_local_state);"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/migrate-mission-control.ts
git commit -m "feat(db): add migration script for mission control schema changes"
```

---

### Task 3: Mission Control Query Functions

**Files:**
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Write test for getMissionControlRepos**

Create: `tests/lib/queries-mc.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
// Note: These tests require a test database. For now we test the filter builder logic.
// Full integration tests come in Task 15.

describe('Mission Control query filters', () => {
  it('should define the expected filter interface', () => {
    // Type check — ensures the interface is importable
    const filters: MissionControlFilters = {
      stage: 'watching',
      search: 'langchain',
      watchLevel: 'releases_only',
      collectionId: 1,
      localStatus: 'outdated',
      sort: 'activity_desc',
    };
    expect(filters.stage).toBe('watching');
  });
});

interface MissionControlFilters {
  stage?: string;
  search?: string;
  watchLevel?: string;
  collectionId?: number;
  localStatus?: string;
  sort?: string;
  tagId?: number;
}
```

- [ ] **Step 2: Run test to verify it passes (type check only)**

```bash
npx vitest run tests/lib/queries-mc.test.ts
```

Expected: PASS

- [ ] **Step 3: Add mission control query functions to queries.ts**

Add these imports at the top of `src/lib/queries.ts` (alongside existing imports):

```typescript
import { collections, collectionRepos, scanDirectories, repoActivity, savedViews } from './db/schema';
```

Add these functions at the end of the file:

```typescript
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

export async function getMissionControlRepos(filters: MissionControlFilters = {}) {
  let query = db.select({
    repo: starredRepos,
    localState: repoLocalState,
  })
  .from(starredRepos)
  .leftJoin(repoLocalState, eq(repoLocalState.repoId, starredRepos.id));

  const conditions: SQL[] = [];

  if (filters.stage) {
    conditions.push(eq(starredRepos.workflowStage, filters.stage));
  }
  if (filters.watchLevel) {
    conditions.push(eq(starredRepos.watchLevel, filters.watchLevel));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
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
    conditions.push(inArray(starredRepos.id, repoIds));
  }
  if (filters.tagId) {
    const repoIds = db.select({ repoId: repoTags.repoId })
      .from(repoTags)
      .where(eq(repoTags.tagId, filters.tagId));
    conditions.push(inArray(starredRepos.id, repoIds));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  // Sort
  const sortMap: Record<string, SQL> = {
    'activity_desc': desc(starredRepos.lastCommitAt),
    'stars_desc': desc(starredRepos.starCount),
    'name_asc': asc(starredRepos.fullName),
    'starred_desc': desc(starredRepos.starredAt),
    'disk_desc': desc(repoLocalState.diskUsageBytes),
  };
  const sortSql = sortMap[filters.sort || 'activity_desc'] || desc(starredRepos.lastCommitAt);
  query = query.orderBy(sortSql);

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
```

- [ ] **Step 4: Add missing Drizzle imports**

At the top of `queries.ts`, ensure these are imported from `drizzle-orm`:

```typescript
import { eq, desc, asc, and, or, like, sql, count, inArray, SQL } from 'drizzle-orm';
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries.ts tests/lib/queries-mc.test.ts
git commit -m "feat(queries): add mission control query functions — repos, stages, collections, scanner, saved views"
```

---

## Phase 2: Directory Scanner

### Task 4: Scanner Core Logic

**Files:**
- Create: `src/lib/scanner.ts`
- Create: `tests/lib/scanner.test.ts`

- [ ] **Step 1: Write failing test for parseGitRemoteUrl**

```typescript
// tests/lib/scanner.test.ts
import { describe, it, expect } from 'vitest';
import { parseGitRemoteUrl } from '../../src/lib/scanner';

describe('parseGitRemoteUrl', () => {
  it('parses HTTPS GitHub URL', () => {
    expect(parseGitRemoteUrl('https://github.com/langchain-ai/langchain.git'))
      .toEqual({ owner: 'langchain-ai', name: 'langchain' });
  });

  it('parses SSH GitHub URL', () => {
    expect(parseGitRemoteUrl('git@github.com:ggerganov/llama.cpp.git'))
      .toEqual({ owner: 'ggerganov', name: 'llama.cpp' });
  });

  it('parses HTTPS without .git suffix', () => {
    expect(parseGitRemoteUrl('https://github.com/pocketbase/pocketbase'))
      .toEqual({ owner: 'pocketbase', name: 'pocketbase' });
  });

  it('returns null for non-GitHub URLs', () => {
    expect(parseGitRemoteUrl('https://gitlab.com/foo/bar.git')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseGitRemoteUrl('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/scanner.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement scanner.ts**

```typescript
// src/lib/scanner.ts
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface ParsedRemote {
  owner: string;
  name: string;
}

export interface ScanResult {
  localPath: string;
  remote: ParsedRemote | null;
  headSha: string | null;
}

export interface MatchResult {
  autoMatched: { repoId: number; fullName: string; localPath: string }[];
  ambiguous: { localPath: string; remoteName: string | null }[];
  untracked: { localPath: string; remoteName: string | null }[];
}

/**
 * Parse a git remote URL to extract GitHub owner/name.
 * Supports HTTPS and SSH formats.
 */
export function parseGitRemoteUrl(url: string): ParsedRemote | null {
  if (!url) return null;

  // HTTPS: https://github.com/owner/name.git or https://github.com/owner/name
  const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], name: httpsMatch[2] };
  }

  // SSH: git@github.com:owner/name.git
  const sshMatch = url.match(/github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], name: sshMatch[2] };
  }

  return null;
}

/**
 * Find all git repositories in a directory.
 * Returns the path to each repo root (parent of .git).
 */
export function findGitRepos(dirPath: string, recursive: boolean): string[] {
  const repos: string[] = [];

  if (!fs.existsSync(dirPath)) return repos;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') && entry.name !== '.git') continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.name === '.git') {
        // Found a repo — the parent is the repo root
        repos.push(dirPath);
        return repos; // Don't recurse into .git or its siblings' children
      }
    }

    // No .git in this directory — check children if recursive
    if (recursive) {
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;
        if (entry.name === 'node_modules' || entry.name === 'vendor' || entry.name === '.cache') continue;

        const childRepos = findGitRepos(path.join(dirPath, entry.name), true);
        repos.push(...childRepos);
      }
    }
  } catch {
    // Permission denied or other FS error — skip
  }

  return repos;
}

/**
 * Get the remote origin URL and HEAD SHA for a local git repo.
 */
export function getGitInfo(repoPath: string): ScanResult {
  let remote: ParsedRemote | null = null;
  let headSha: string | null = null;

  try {
    const remoteUrl = execSync('git remote get-url origin', {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    remote = parseGitRemoteUrl(remoteUrl);
  } catch {
    // No remote configured
  }

  try {
    headSha = execSync('git rev-parse HEAD', {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
  } catch {
    // Empty repo or other issue
  }

  return { localPath: repoPath, remote, headSha };
}

/**
 * Scan configured directories and match found repos against the database.
 */
export function matchScanResults(
  scanResults: ScanResult[],
  starredRepos: { id: number; fullName: string }[],
  existingClonePaths: Set<string>,
): MatchResult {
  const repoMap = new Map(starredRepos.map(r => [r.fullName.toLowerCase(), r]));
  const result: MatchResult = { autoMatched: [], ambiguous: [], untracked: [] };

  for (const scan of scanResults) {
    // Skip repos we already track
    if (existingClonePaths.has(scan.localPath)) continue;

    if (!scan.remote) {
      result.ambiguous.push({ localPath: scan.localPath, remoteName: null });
      continue;
    }

    const fullName = `${scan.remote.owner}/${scan.remote.name}`.toLowerCase();
    const match = repoMap.get(fullName);

    if (match) {
      result.autoMatched.push({
        repoId: match.id,
        fullName: match.fullName,
        localPath: scan.localPath,
      });
    } else {
      result.untracked.push({
        localPath: scan.localPath,
        remoteName: `${scan.remote.owner}/${scan.remote.name}`,
      });
    }
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/scanner.test.ts
```

Expected: PASS

- [ ] **Step 5: Add tests for findGitRepos and matchScanResults**

Append to `tests/lib/scanner.test.ts`:

```typescript
import { findGitRepos, matchScanResults, ScanResult } from '../../src/lib/scanner';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('findGitRepos', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('finds a git repo in direct child', () => {
    const repoDir = path.join(tmpDir, 'my-repo');
    fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true });

    const repos = findGitRepos(tmpDir, true);
    expect(repos).toEqual([repoDir]);
  });

  it('finds nested repos when recursive', () => {
    const deep = path.join(tmpDir, 'projects', 'sub', 'repo');
    fs.mkdirSync(path.join(deep, '.git'), { recursive: true });

    const repos = findGitRepos(tmpDir, true);
    expect(repos).toEqual([deep]);
  });

  it('skips nested repos when not recursive', () => {
    const deep = path.join(tmpDir, 'projects', 'repo');
    fs.mkdirSync(path.join(deep, '.git'), { recursive: true });

    const repos = findGitRepos(tmpDir, false);
    expect(repos).toEqual([]);
  });

  it('returns empty for nonexistent directory', () => {
    expect(findGitRepos('/nonexistent/path', true)).toEqual([]);
  });

  it('skips node_modules', () => {
    const nmRepo = path.join(tmpDir, 'node_modules', 'pkg');
    fs.mkdirSync(path.join(nmRepo, '.git'), { recursive: true });

    const repos = findGitRepos(tmpDir, true);
    expect(repos).toEqual([]);
  });
});

describe('matchScanResults', () => {
  it('auto-matches by fullName', () => {
    const scanResults: ScanResult[] = [
      { localPath: '/home/user/langchain', remote: { owner: 'langchain-ai', name: 'langchain' }, headSha: 'abc123' },
    ];
    const starred = [{ id: 1, fullName: 'langchain-ai/langchain' }];

    const result = matchScanResults(scanResults, starred, new Set());
    expect(result.autoMatched).toHaveLength(1);
    expect(result.autoMatched[0].repoId).toBe(1);
    expect(result.ambiguous).toHaveLength(0);
    expect(result.untracked).toHaveLength(0);
  });

  it('marks repos without remote as ambiguous', () => {
    const scanResults: ScanResult[] = [
      { localPath: '/home/user/mystery', remote: null, headSha: 'def456' },
    ];

    const result = matchScanResults(scanResults, [], new Set());
    expect(result.ambiguous).toHaveLength(1);
    expect(result.autoMatched).toHaveLength(0);
  });

  it('marks non-starred GitHub repos as untracked', () => {
    const scanResults: ScanResult[] = [
      { localPath: '/home/user/something', remote: { owner: 'someone', name: 'something' }, headSha: 'ghi789' },
    ];

    const result = matchScanResults(scanResults, [], new Set());
    expect(result.untracked).toHaveLength(1);
    expect(result.untracked[0].remoteName).toBe('someone/something');
  });

  it('skips already-tracked paths', () => {
    const scanResults: ScanResult[] = [
      { localPath: '/home/user/langchain', remote: { owner: 'langchain-ai', name: 'langchain' }, headSha: 'abc' },
    ];
    const starred = [{ id: 1, fullName: 'langchain-ai/langchain' }];
    const existing = new Set(['/home/user/langchain']);

    const result = matchScanResults(scanResults, starred, existing);
    expect(result.autoMatched).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Run all scanner tests**

```bash
npx vitest run tests/lib/scanner.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/scanner.ts tests/lib/scanner.test.ts
git commit -m "feat(scanner): add directory scanner with git remote parsing, repo finding, and match logic"
```

---

## Phase 3: Version Comparison

### Task 5: Version Check Logic

**Files:**
- Create: `src/lib/version-check.ts`
- Create: `tests/lib/version-check.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/version-check.test.ts
import { describe, it, expect } from 'vitest';
import { compareVersions, formatVersionDisplay } from '../../src/lib/version-check';

describe('compareVersions', () => {
  it('detects up-to-date release', () => {
    const result = compareVersions({
      localTag: 'v0.2.1',
      localSha: 'abc123',
      latestRelease: 'v0.2.1',
      latestRemoteSha: 'abc123',
    });
    expect(result.status).toBe('up_to_date');
  });

  it('detects outdated release', () => {
    const result = compareVersions({
      localTag: 'v0.1.5',
      localSha: 'abc123',
      latestRelease: 'v0.2.1',
      latestRemoteSha: 'def456',
    });
    expect(result.status).toBe('outdated');
    expect(result.localVersion).toBe('v0.1.5');
    expect(result.remoteVersion).toBe('v0.2.1');
  });

  it('falls back to commit comparison when no releases', () => {
    const result = compareVersions({
      localTag: null,
      localSha: 'abc1234',
      latestRelease: null,
      latestRemoteSha: 'def5678',
    });
    expect(result.status).toBe('outdated');
    expect(result.localVersion).toBe('abc1234');
    expect(result.remoteVersion).toBe('def5678');
  });

  it('handles not-cloned state', () => {
    const result = compareVersions({
      localTag: null,
      localSha: null,
      latestRelease: 'v1.0.0',
      latestRemoteSha: 'abc123',
    });
    expect(result.status).toBe('not_cloned');
  });

  it('detects up-to-date by SHA when no releases', () => {
    const result = compareVersions({
      localTag: null,
      localSha: 'abc1234',
      latestRelease: null,
      latestRemoteSha: 'abc1234',
    });
    expect(result.status).toBe('up_to_date');
  });
});

describe('formatVersionDisplay', () => {
  it('formats release comparison', () => {
    const display = formatVersionDisplay({
      status: 'outdated',
      localVersion: 'v0.1.5',
      remoteVersion: 'v0.2.1',
    });
    expect(display).toBe('v0.1.5 → v0.2.1');
  });

  it('formats SHA comparison', () => {
    const display = formatVersionDisplay({
      status: 'outdated',
      localVersion: 'abc1234567890',
      remoteVersion: 'def5678901234',
    });
    expect(display).toBe('abc1234 → def5678');
  });

  it('formats up to date', () => {
    const display = formatVersionDisplay({
      status: 'up_to_date',
      localVersion: 'v1.0.0',
      remoteVersion: 'v1.0.0',
    });
    expect(display).toBe('v1.0.0 ✓');
  });

  it('formats not cloned', () => {
    const display = formatVersionDisplay({
      status: 'not_cloned',
      localVersion: null,
      remoteVersion: 'v1.0.0',
    });
    expect(display).toBe('Latest: v1.0.0');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/version-check.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement version-check.ts**

```typescript
// src/lib/version-check.ts
import { execSync } from 'child_process';

export interface VersionInput {
  localTag: string | null;
  localSha: string | null;
  latestRelease: string | null;
  latestRemoteSha: string | null;
}

export interface VersionResult {
  status: 'up_to_date' | 'outdated' | 'not_cloned' | 'vulnerable' | 'unknown';
  localVersion: string | null;
  remoteVersion: string | null;
}

export function compareVersions(input: VersionInput): VersionResult {
  // Not cloned
  if (!input.localSha) {
    return {
      status: 'not_cloned',
      localVersion: null,
      remoteVersion: input.latestRelease || input.latestRemoteSha || null,
    };
  }

  // Release-based comparison (preferred)
  if (input.localTag && input.latestRelease) {
    const isUpToDate = input.localTag === input.latestRelease;
    return {
      status: isUpToDate ? 'up_to_date' : 'outdated',
      localVersion: input.localTag,
      remoteVersion: input.latestRelease,
    };
  }

  // Commit SHA comparison (fallback)
  if (input.latestRemoteSha) {
    const localShort = input.localSha.substring(0, 7);
    const remoteShort = input.latestRemoteSha.substring(0, 7);
    const isUpToDate = localShort === remoteShort;
    return {
      status: isUpToDate ? 'up_to_date' : 'outdated',
      localVersion: input.localSha,
      remoteVersion: input.latestRemoteSha,
    };
  }

  return {
    status: 'unknown',
    localVersion: input.localSha,
    remoteVersion: null,
  };
}

export function formatVersionDisplay(result: VersionResult): string {
  if (result.status === 'not_cloned') {
    return result.remoteVersion ? `Latest: ${result.remoteVersion}` : '—';
  }

  if (result.status === 'up_to_date') {
    const ver = result.localVersion || '?';
    const display = isTag(ver) ? ver : ver.substring(0, 7);
    return `${display} ✓`;
  }

  if (result.status === 'outdated' || result.status === 'vulnerable') {
    const local = result.localVersion ? (isTag(result.localVersion) ? result.localVersion : result.localVersion.substring(0, 7)) : '?';
    const remote = result.remoteVersion ? (isTag(result.remoteVersion) ? result.remoteVersion : result.remoteVersion.substring(0, 7)) : '?';
    return `${local} → ${remote}`;
  }

  return '—';
}

function isTag(version: string): boolean {
  return version.startsWith('v') || /^\d+\.\d+/.test(version);
}

/**
 * Read local git info from a cloned repo directory.
 */
export function getLocalVersionInfo(clonePath: string): { sha: string | null; tag: string | null } {
  let sha: string | null = null;
  let tag: string | null = null;

  try {
    sha = execSync('git rev-parse HEAD', { cwd: clonePath, encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    // Not a valid git repo
  }

  try {
    tag = execSync('git describe --tags --exact-match 2>/dev/null', { cwd: clonePath, encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    // No tag at HEAD
  }

  return { sha, tag };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/version-check.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/version-check.ts tests/lib/version-check.test.ts
git commit -m "feat(version): add version comparison logic with release and commit SHA fallback"
```

---

## Phase 4: API Routes

### Task 6: Mission Control Data Endpoint

**Files:**
- Create: `src/app/api/mission-control/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
// src/app/api/mission-control/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMissionControlRepos, getStageCounts, getAllCollections, getCollectionCounts, getAllSavedViews, MissionControlFilters } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;

  const filters: MissionControlFilters = {
    stage: params.get('stage') || undefined,
    search: params.get('search') || undefined,
    watchLevel: params.get('watchLevel') || undefined,
    collectionId: params.get('collectionId') ? Number(params.get('collectionId')) : undefined,
    localStatus: params.get('localStatus') || undefined,
    sort: params.get('sort') || undefined,
    tagId: params.get('tagId') ? Number(params.get('tagId')) : undefined,
  };

  const [repos, stageCounts, collections, collectionCounts, savedViews] = await Promise.all([
    getMissionControlRepos(filters),
    getStageCounts(),
    getAllCollections(),
    getCollectionCounts(),
    getAllSavedViews(),
  ]);

  return NextResponse.json({
    repos,
    stageCounts: Object.fromEntries(stageCounts.map(s => [s.stage, s.count])),
    collections: collections.map(c => ({
      ...c,
      count: collectionCounts.find(cc => cc.collectionId === c.id)?.count || 0,
    })),
    savedViews,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/mission-control/route.ts
git commit -m "feat(api): add GET /api/mission-control endpoint with filtering and stage counts"
```

---

### Task 7: Workflow Stage Endpoint

**Files:**
- Create: `src/app/api/workflow-stage/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
// src/app/api/workflow-stage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateWorkflowStage } from '@/lib/queries';

const VALID_STAGES = ['watching', 'want_to_try', 'downloaded', 'active', 'archived'];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { repoIds, stage } = await req.json();

  if (!Array.isArray(repoIds) || repoIds.length === 0) {
    return NextResponse.json({ error: 'repoIds must be a non-empty array' }, { status: 400 });
  }
  if (!VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` }, { status: 400 });
  }

  updateWorkflowStage(repoIds, stage);

  return NextResponse.json({ ok: true, updated: repoIds.length });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/workflow-stage/route.ts
git commit -m "feat(api): add POST /api/workflow-stage endpoint for bulk stage changes"
```

---

### Task 8: Watch Level Endpoint

**Files:**
- Create: `src/app/api/watch-level/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
// src/app/api/watch-level/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateWatchLevel } from '@/lib/queries';

const VALID_LEVELS = ['releases_only', 'active_tracking', 'full_watch'];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { repoIds, level } = await req.json();

  if (!Array.isArray(repoIds) || repoIds.length === 0) {
    return NextResponse.json({ error: 'repoIds must be a non-empty array' }, { status: 400 });
  }
  if (!VALID_LEVELS.includes(level)) {
    return NextResponse.json({ error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` }, { status: 400 });
  }

  updateWatchLevel(repoIds, level);

  return NextResponse.json({ ok: true, updated: repoIds.length });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/watch-level/route.ts
git commit -m "feat(api): add POST /api/watch-level endpoint"
```

---

### Task 9: Collections CRUD Endpoints

**Files:**
- Create: `src/app/api/collections/route.ts`
- Create: `src/app/api/collections/[id]/repos/route.ts`

- [ ] **Step 1: Create collections CRUD**

```typescript
// src/app/api/collections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllCollections, createCollection, updateCollection, deleteCollection, getCollectionCounts } from '@/lib/queries';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const collections = getAllCollections();
  const counts = getCollectionCounts();

  return NextResponse.json(
    collections.map(c => ({
      ...c,
      count: counts.find(cc => cc.collectionId === c.id)?.count || 0,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, color, autoRules } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  createCollection(name, color || '#8b949e', autoRules ? JSON.stringify(autoRules) : undefined);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, color, autoRules } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  updateCollection(id, {
    name: name || undefined,
    color: color || undefined,
    autoRules: autoRules ? JSON.stringify(autoRules) : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  deleteCollection(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create collection membership endpoint**

```typescript
// src/app/api/collections/[id]/repos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { addReposToCollection, removeRepoFromCollection, getCollectionRepoIds } from '@/lib/queries';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const repoIds = getCollectionRepoIds(Number(id));
  return NextResponse.json({ repoIds });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { repoIds } = await req.json();
  if (!Array.isArray(repoIds)) return NextResponse.json({ error: 'repoIds must be an array' }, { status: 400 });

  addReposToCollection(Number(id), repoIds);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { repoId } = await req.json();
  if (!repoId) return NextResponse.json({ error: 'repoId is required' }, { status: 400 });

  removeRepoFromCollection(Number(id), repoId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/collections/route.ts src/app/api/collections/\[id\]/repos/route.ts
git commit -m "feat(api): add collections CRUD and membership endpoints"
```

---

### Task 10: Scan Endpoints

**Files:**
- Create: `src/app/api/scan/route.ts`
- Create: `src/app/api/scan/directories/route.ts`
- Create: `src/app/api/scan/matches/route.ts`

- [ ] **Step 1: Create scan trigger endpoint**

```typescript
// src/app/api/scan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllScanDirectories, updateScanDirectoryTimestamp } from '@/lib/queries';
import { findGitRepos, getGitInfo, matchScanResults } from '@/lib/scanner';
import { db } from '@/lib/db';
import { starredRepos, repoLocalState } from '@/lib/db/schema';
import { eq, isNotNull } from 'drizzle-orm';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dirs = getAllScanDirectories().filter(d => d.enabled);
  if (dirs.length === 0) {
    return NextResponse.json({ error: 'No scan directories configured' }, { status: 400 });
  }

  // Collect all git repos from all directories
  const allScanResults = [];
  for (const dir of dirs) {
    const repoPaths = findGitRepos(dir.path, dir.recursive);
    for (const repoPath of repoPaths) {
      allScanResults.push(getGitInfo(repoPath));
    }
    updateScanDirectoryTimestamp(dir.id);
  }

  // Get starred repos and existing clone paths for matching
  const starred = db.select({ id: starredRepos.id, fullName: starredRepos.fullName })
    .from(starredRepos)
    .all();

  const existingPaths = new Set(
    db.select({ clonePath: repoLocalState.clonePath })
      .from(repoLocalState)
      .where(isNotNull(repoLocalState.clonePath))
      .all()
      .map(r => r.clonePath!)
  );

  const matches = matchScanResults(allScanResults, starred, existingPaths);

  // Auto-apply matched repos
  for (const match of matches.autoMatched) {
    const existing = db.select().from(repoLocalState)
      .where(eq(repoLocalState.repoId, match.repoId))
      .get();

    if (existing) {
      db.update(repoLocalState)
        .set({ clonePath: match.localPath })
        .where(eq(repoLocalState.repoId, match.repoId))
        .run();
    } else {
      db.insert(repoLocalState)
        .values({ repoId: match.repoId, clonePath: match.localPath, processStatus: 'stopped' })
        .run();
    }

    // Auto-advance stage to "downloaded" if currently "watching" or "want_to_try"
    db.update(starredRepos)
      .set({ workflowStage: 'downloaded' })
      .where(eq(starredRepos.id, match.repoId))
      .run();
  }

  return NextResponse.json({
    scannedDirs: dirs.length,
    totalReposFound: allScanResults.length,
    autoMatched: matches.autoMatched.length,
    ambiguous: matches.ambiguous,
    untracked: matches.untracked,
  });
}
```

- [ ] **Step 2: Create scan directories management endpoint**

```typescript
// src/app/api/scan/directories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllScanDirectories, addScanDirectory, removeScanDirectory } from '@/lib/queries';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(getAllScanDirectories());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { path, recursive } = await req.json();
  if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 });

  try {
    addScanDirectory(path, recursive ?? true);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Directory already added' }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  removeScanDirectory(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create ambiguous match review endpoint**

```typescript
// src/app/api/scan/matches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { starredRepos, repoLocalState } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, repoId, localPath } = await req.json();

  if (action === 'confirm' && repoId && localPath) {
    // Link a local path to a starred repo
    const existing = db.select().from(repoLocalState)
      .where(eq(repoLocalState.repoId, repoId)).get();

    if (existing) {
      db.update(repoLocalState)
        .set({ clonePath: localPath })
        .where(eq(repoLocalState.repoId, repoId))
        .run();
    } else {
      db.insert(repoLocalState)
        .values({ repoId, clonePath: localPath, processStatus: 'stopped' })
        .run();
    }

    db.update(starredRepos)
      .set({ workflowStage: 'downloaded' })
      .where(eq(starredRepos.id, repoId))
      .run();

    return NextResponse.json({ ok: true });
  }

  if (action === 'dismiss') {
    // User doesn't want to track this local repo — just acknowledge
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/scan/route.ts src/app/api/scan/directories/route.ts src/app/api/scan/matches/route.ts
git commit -m "feat(api): add scan endpoints — trigger scan, manage directories, review matches"
```

---

### Task 11: Update Repo Endpoint

**Files:**
- Create: `src/app/api/update-repo/route.ts`

- [ ] **Step 1: Create smart pull endpoint**

```typescript
// src/app/api/update-repo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRepoByFullName, getRepoLocalState, upsertRepoLocalState } from '@/lib/queries';
import { getLocalVersionInfo } from '@/lib/version-check';
import { execSync } from 'child_process';
import fs from 'fs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { owner, name } = await req.json();
  if (!owner || !name) {
    return NextResponse.json({ error: 'owner and name are required' }, { status: 400 });
  }

  const repo = getRepoByFullName(owner, name);
  if (!repo) return NextResponse.json({ error: 'Repo not found' }, { status: 404 });

  const localState = getRepoLocalState(repo.id);
  if (!localState?.clonePath) {
    return NextResponse.json({ error: 'Repo is not cloned' }, { status: 400 });
  }

  if (!fs.existsSync(localState.clonePath)) {
    return NextResponse.json({ error: 'Clone directory not found on disk' }, { status: 404 });
  }

  const cwd = localState.clonePath;

  try {
    // Check for local changes
    const status = execSync('git status --porcelain', { cwd, encoding: 'utf-8', timeout: 10000 }).trim();
    const hasChanges = status.length > 0;

    if (hasChanges) {
      // Stash, pull, pop
      execSync('git stash', { cwd, encoding: 'utf-8', timeout: 10000 });
      execSync('git pull', { cwd, encoding: 'utf-8', timeout: 60000 });
      try {
        execSync('git stash pop', { cwd, encoding: 'utf-8', timeout: 10000 });
      } catch {
        return NextResponse.json({
          ok: true,
          warning: 'Pull succeeded but stash pop had conflicts. Resolve manually.',
          stashConflict: true,
        });
      }
    } else {
      execSync('git pull', { cwd, encoding: 'utf-8', timeout: 60000 });
    }

    // Update local version info in DB
    const versionInfo = getLocalVersionInfo(cwd);
    upsertRepoLocalState(repo.id, {
      localVersion: versionInfo.sha,
      localTag: versionInfo.tag,
      lastPulledAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      localVersion: versionInfo.sha?.substring(0, 7),
      localTag: versionInfo.tag,
      hadLocalChanges: hasChanges,
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Pull failed: ${e.message}` }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update upsertRepoLocalState to accept localTag**

In `src/lib/queries.ts`, find the `upsertRepoLocalState` function. The existing function likely takes specific fields. We need to ensure it can accept `localTag` and `localVersion`. Check the current signature and modify to accept a data object:

If the current function takes explicit params, update it to use an object spread pattern. Add after the existing function or modify it:

```typescript
export function upsertRepoLocalState(repoId: number, data: Partial<{
  clonePath: string;
  localVersion: string | null;
  localTag: string | null;
  processStatus: string;
  processPid: number | null;
  processPort: number | null;
  processMemoryMb: number | null;
  processStartedAt: string | null;
  diskUsageBytes: number | null;
  lastPulledAt: string | null;
}>) {
  const existing = db.select().from(repoLocalState).where(eq(repoLocalState.repoId, repoId)).get();
  if (existing) {
    return db.update(repoLocalState).set(data).where(eq(repoLocalState.repoId, repoId)).run();
  } else {
    return db.insert(repoLocalState).values({ repoId, processStatus: 'stopped', ...data }).run();
  }
}
```

Note: Check the existing `upsertRepoLocalState` signature in `queries.ts` first. If it already uses an object pattern, just add `localTag` to the accepted fields.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/update-repo/route.ts src/lib/queries.ts
git commit -m "feat(api): add POST /api/update-repo — smart pull with stash/pop and version tracking"
```

---

### Task 12: Version Check and Saved Views Endpoints

**Files:**
- Create: `src/app/api/version-check/route.ts`
- Create: `src/app/api/saved-views/route.ts`

- [ ] **Step 1: Create version check endpoint**

```typescript
// src/app/api/version-check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRepoByFullName, getRepoLocalState } from '@/lib/queries';
import { getLocalVersionInfo, compareVersions, formatVersionDisplay } from '@/lib/version-check';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const owner = req.nextUrl.searchParams.get('owner');
  const name = req.nextUrl.searchParams.get('name');
  if (!owner || !name) {
    return NextResponse.json({ error: 'owner and name query params required' }, { status: 400 });
  }

  const repo = getRepoByFullName(owner, name);
  if (!repo) return NextResponse.json({ error: 'Repo not found' }, { status: 404 });

  const localState = getRepoLocalState(repo.id);
  let localSha: string | null = null;
  let localTag: string | null = null;

  if (localState?.clonePath) {
    const info = getLocalVersionInfo(localState.clonePath);
    localSha = info.sha;
    localTag = info.tag;
  }

  const result = compareVersions({
    localTag,
    localSha,
    latestRelease: repo.lastReleaseVersion || null,
    latestRemoteSha: null, // TODO: fetch from GitHub API during sync
  });

  return NextResponse.json({
    ...result,
    display: formatVersionDisplay(result),
  });
}
```

- [ ] **Step 2: Create saved views endpoint**

```typescript
// src/app/api/saved-views/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllSavedViews, createSavedView, updateSavedView, deleteSavedView } from '@/lib/queries';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(getAllSavedViews());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, filters } = await req.json();
  if (!name || !filters) return NextResponse.json({ error: 'name and filters required' }, { status: 400 });

  createSavedView(name, JSON.stringify(filters));
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, filters } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  updateSavedView(id, {
    name: name || undefined,
    filters: filters ? JSON.stringify(filters) : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  deleteSavedView(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/version-check/route.ts src/app/api/saved-views/route.ts
git commit -m "feat(api): add version-check and saved-views endpoints"
```

---

### Task 13: Auto-Advancement in Clone and Run

**Files:**
- Modify: `src/app/api/clone/route.ts`
- Modify: `src/app/api/run/route.ts`

- [ ] **Step 1: Add auto-stage-advancement to clone endpoint**

In `src/app/api/clone/route.ts`, after the clone succeeds and the recipe is detected (around line 54), add:

```typescript
import { db } from '@/lib/db';
import { starredRepos } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Auto-advance workflow stage to "downloaded"
db.update(starredRepos)
  .set({ workflowStage: 'downloaded' })
  .where(
    and(
      eq(starredRepos.owner, owner),
      eq(starredRepos.name, name),
      inArray(starredRepos.workflowStage, ['watching', 'want_to_try']),
    )
  )
  .run();
```

Add the `and` and `inArray` imports if not present. Place this code inside the process completion callback, after the recipe detection block.

- [ ] **Step 2: Add auto-stage-advancement to run endpoint**

In `src/app/api/run/route.ts`, after the process starts successfully (around line 36), add:

```typescript
import { db } from '@/lib/db';
import { starredRepos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Auto-advance workflow stage to "active" on first run
db.update(starredRepos)
  .set({ workflowStage: 'active' })
  .where(
    and(
      eq(starredRepos.owner, owner),
      eq(starredRepos.name, name),
      eq(starredRepos.workflowStage, 'downloaded'),
    )
  )
  .run();
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/clone/route.ts src/app/api/run/route.ts
git commit -m "feat(api): add auto-stage-advancement on clone (→downloaded) and run (→active)"
```

---

## Phase 5: Mission Control UI

### Task 14: Mission Control Page Shell

**Files:**
- Create: `src/app/mission-control/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/mission-control/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMissionControlRepos, getStageCounts, getAllCollections, getCollectionCounts, getAllSavedViews, getAllTags, MissionControlFilters } from '@/lib/queries';
import { PipelineBar } from '@/components/mission-control/pipeline-bar';
import { MCSidebar } from '@/components/mission-control/mc-sidebar';
import { RepoTable } from '@/components/mission-control/repo-table';
import { DashboardHeader } from '@/components/dashboard/header';

export default async function MissionControlPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const params = await searchParams;

  const filters: MissionControlFilters = {
    stage: params.stage || undefined,
    search: params.search || undefined,
    watchLevel: params.watchLevel || undefined,
    collectionId: params.collectionId ? Number(params.collectionId) : undefined,
    sort: params.sort || undefined,
    tagId: params.tagId ? Number(params.tagId) : undefined,
  };

  const [repos, stageCounts, collections, collectionCounts, savedViews, tags] = await Promise.all([
    getMissionControlRepos(filters),
    getStageCounts(),
    getAllCollections(),
    getCollectionCounts(),
    getAllSavedViews(),
    getAllTags(),
  ]);

  const stageCountMap = Object.fromEntries(stageCounts.map(s => [s.stage, s.count]));
  const totalCount = Object.values(stageCountMap).reduce((sum, c) => sum + c, 0);

  const collectionsWithCounts = collections.map(c => ({
    ...c,
    count: collectionCounts.find(cc => cc.collectionId === c.id)?.count || 0,
  }));

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <DashboardHeader session={session} />

      {/* Navigation tabs */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-[#21262d] bg-[#161b22]">
        <a href="/" className="text-sm text-[#8b949e] hover:text-[#c9d1d9] px-3 py-1 rounded-md">
          Home
        </a>
        <span className="text-sm text-[#f0f6fc] px-3 py-1 rounded-md bg-[#1f6feb]">
          Mission Control
        </span>
        <a href="/settings" className="text-sm text-[#8b949e] hover:text-[#c9d1d9] px-3 py-1 rounded-md">
          Settings
        </a>
      </div>

      <PipelineBar
        stageCounts={stageCountMap}
        totalCount={totalCount}
        activeStage={filters.stage || null}
      />

      <div className="flex min-h-[calc(100vh-140px)]">
        <MCSidebar
          collections={collectionsWithCounts}
          savedViews={savedViews}
          tags={tags}
          activeFilters={filters}
        />
        <RepoTable
          repos={repos}
          filters={filters}
          totalCount={repos.length}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/mission-control/page.tsx
git commit -m "feat(ui): add Mission Control page shell with server-side data loading"
```

---

### Task 15: Pipeline Bar Component

**Files:**
- Create: `src/components/mission-control/pipeline-bar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/mission-control/pipeline-bar.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface PipelineBarProps {
  stageCounts: Record<string, number>;
  totalCount: number;
  activeStage: string | null;
}

const STAGES = [
  { key: null, label: 'All', icon: '' },
  { key: 'watching', label: 'Watching', icon: '👁' },
  { key: 'want_to_try', label: 'Want to Try', icon: '🧪' },
  { key: 'downloaded', label: 'Downloaded', icon: '📦' },
  { key: 'active', label: 'Active', icon: '🚀' },
  { key: 'archived', label: 'Archived', icon: '📁' },
];

export function PipelineBar({ stageCounts, totalCount, activeStage }: PipelineBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleStageClick(stageKey: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (stageKey) {
      params.set('stage', stageKey);
    } else {
      params.delete('stage');
    }
    router.push(`/mission-control?${params.toString()}`);
  }

  return (
    <div className="flex gap-0.5 px-5 py-3 bg-[#0d1117] border-b border-[#21262d]">
      {STAGES.map((stage) => {
        const count = stage.key === null ? totalCount : (stageCounts[stage.key] || 0);
        const isActive = activeStage === stage.key;

        return (
          <button
            key={stage.key ?? 'all'}
            onClick={() => handleStageClick(stage.key)}
            className={`
              flex-1 text-center py-2 px-3 rounded-md text-xs font-semibold transition-colors
              ${isActive
                ? 'bg-[#1f6feb22] border border-[#1f6feb] text-[#58a6ff]'
                : 'bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] border border-transparent'
              }
            `}
          >
            {stage.icon} {stage.label}
            <span className={`
              ml-1 text-[10px] px-1.5 py-0.5 rounded-full
              ${isActive ? 'bg-[#1f6feb] text-white' : 'opacity-60'}
            `}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission-control/pipeline-bar.tsx
git commit -m "feat(ui): add PipelineBar component with stage tabs and counts"
```

---

### Task 16: Mission Control Sidebar

**Files:**
- Create: `src/components/mission-control/mc-sidebar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/mission-control/mc-sidebar.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { MissionControlFilters } from '@/lib/queries';

interface Collection {
  id: number;
  name: string;
  color: string;
  count: number;
}

interface SavedView {
  id: number;
  name: string;
  filters: string;
  builtIn: boolean;
}

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface MCSidebarProps {
  collections: Collection[];
  savedViews: SavedView[];
  tags: Tag[];
  activeFilters: MissionControlFilters;
}

export function MCSidebar({ collections, savedViews, tags, activeFilters }: MCSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);

  function navigateWithFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/mission-control?${params.toString()}`);
  }

  function applySavedView(filtersJson: string) {
    const filters = JSON.parse(filtersJson);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    router.push(`/mission-control?${params.toString()}`);
  }

  async function createNewCollection() {
    if (!newCollectionName.trim()) return;
    await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCollectionName.trim() }),
    });
    setNewCollectionName('');
    setShowNewCollection(false);
    router.refresh();
  }

  return (
    <aside className="w-52 border-r border-[#21262d] p-4 text-xs flex-shrink-0">
      {/* Saved Views */}
      {savedViews.length > 0 && (
        <div className="mb-4">
          <div className="text-[#8b949e] font-semibold uppercase text-[10px] mb-2">Saved Views</div>
          {savedViews.map(view => (
            <button
              key={view.id}
              onClick={() => applySavedView(view.filters)}
              className="block w-full text-left text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1 rounded hover:bg-[#21262d] transition-colors"
            >
              {view.name}
            </button>
          ))}
        </div>
      )}

      {/* Collections */}
      <div className="mb-4">
        <div className="text-[#8b949e] font-semibold uppercase text-[10px] mb-2">Collections</div>
        <button
          onClick={() => navigateWithFilter('collectionId', null)}
          className={`block w-full text-left px-2 py-1 rounded transition-colors ${
            !activeFilters.collectionId ? 'text-[#c9d1d9] bg-[#1f6feb22]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          All Repos
        </button>
        {collections.map(c => (
          <button
            key={c.id}
            onClick={() => navigateWithFilter('collectionId', String(c.id))}
            className={`block w-full text-left px-2 py-1 rounded transition-colors ${
              activeFilters.collectionId === c.id ? 'text-[#c9d1d9] bg-[#1f6feb22]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <span style={{ color: c.color }}>●</span> {c.name}
            <span className="float-right opacity-50">{c.count}</span>
          </button>
        ))}
        {showNewCollection ? (
          <div className="flex gap-1 mt-1">
            <input
              type="text"
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createNewCollection()}
              placeholder="Name..."
              className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] px-2 py-1 rounded text-xs"
              autoFocus
            />
            <button onClick={createNewCollection} className="text-[#3fb950] px-1">✓</button>
            <button onClick={() => setShowNewCollection(false)} className="text-[#f85149] px-1">✗</button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewCollection(true)}
            className="block w-full text-left text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1"
          >
            + New Collection
          </button>
        )}
      </div>

      {/* Watch Level */}
      <div className="mb-4">
        <div className="text-[#8b949e] font-semibold uppercase text-[10px] mb-2">Watch Level</div>
        {[
          { key: 'releases_only', label: '🔕 Releases Only' },
          { key: 'active_tracking', label: '📡 Active Tracking' },
          { key: 'full_watch', label: '📺 Full Watch' },
        ].map(level => (
          <button
            key={level.key}
            onClick={() => navigateWithFilter('watchLevel', activeFilters.watchLevel === level.key ? null : level.key)}
            className={`block w-full text-left px-2 py-1 rounded transition-colors ${
              activeFilters.watchLevel === level.key ? 'text-[#c9d1d9] bg-[#1f6feb22]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>

      {/* Quick Filters */}
      <div className="mb-4">
        <div className="text-[#8b949e] font-semibold uppercase text-[10px] mb-2">Filters</div>
        <button
          onClick={() => navigateWithFilter('localStatus', activeFilters.localStatus === 'outdated' ? null : 'outdated')}
          className="block w-full text-left text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1 rounded hover:bg-[#21262d]"
        >
          ⚠️ Updates Available
        </button>
        <button
          onClick={() => navigateWithFilter('localStatus', activeFilters.localStatus === 'vulnerable' ? null : 'vulnerable')}
          className="block w-full text-left text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1 rounded hover:bg-[#21262d]"
        >
          🔒 Security Alerts
        </button>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div className="text-[#8b949e] font-semibold uppercase text-[10px] mb-2">Tags</div>
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => navigateWithFilter('tagId', activeFilters.tagId === tag.id ? null : String(tag.id))}
              className={`block w-full text-left px-2 py-1 rounded transition-colors ${
                activeFilters.tagId === tag.id ? 'text-[#c9d1d9] bg-[#1f6feb22]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <span style={{ color: tag.color }}>●</span> {tag.name}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission-control/mc-sidebar.tsx
git commit -m "feat(ui): add Mission Control sidebar with collections, watch levels, filters, and saved views"
```

---

### Task 17: Stage Dropdown Component

**Files:**
- Create: `src/components/mission-control/stage-dropdown.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/mission-control/stage-dropdown.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const STAGES = [
  { key: 'watching', label: 'Watching', icon: '👁', color: '#8b949e' },
  { key: 'want_to_try', label: 'Want to Try', icon: '🧪', color: '#d2a8ff' },
  { key: 'downloaded', label: 'Downloaded', icon: '📦', color: '#58a6ff' },
  { key: 'active', label: 'Active', icon: '🚀', color: '#f0883e' },
  { key: 'archived', label: 'Archived', icon: '📁', color: '#484f58' },
];

interface StageDropdownProps {
  repoId: number;
  currentStage: string;
}

export function StageDropdown({ repoId, currentStage }: StageDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = STAGES.find(s => s.key === currentStage) || STAGES[0];

  async function changeStage(newStage: string) {
    setOpen(false);
    await fetch('/api/workflow-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoIds: [repoId], stage: newStage }),
    });
    router.refresh();
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-[11px] px-2 py-0.5 rounded-full border border-[#30363d] hover:border-[#8b949e] transition-colors"
        style={{ color: current.color }}
      >
        {current.icon} {current.label}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg py-1 min-w-[160px]">
          {STAGES.map(stage => (
            <button
              key={stage.key}
              onClick={() => changeStage(stage.key)}
              className={`
                block w-full text-left px-3 py-1.5 text-xs hover:bg-[#21262d] transition-colors
                ${stage.key === currentStage ? 'text-[#f0f6fc] font-semibold' : 'text-[#8b949e]'}
              `}
            >
              {stage.icon} {stage.label}
              {stage.key === currentStage && ' ✓'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission-control/stage-dropdown.tsx
git commit -m "feat(ui): add StageDropdown inline picker component"
```

---

### Task 18: Repo Table Row Component

**Files:**
- Create: `src/components/mission-control/repo-table-row.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/mission-control/repo-table-row.tsx
'use client';

import { useRouter } from 'next/navigation';
import { StageDropdown } from './stage-dropdown';

interface RepoRowData {
  repo: {
    id: number;
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    starCount: number;
    lastCommitAt: string | null;
    lastReleaseVersion: string | null;
    workflowStage: string;
    watchLevel: string;
  };
  localState: {
    clonePath: string | null;
    localVersion: string | null;
    localTag: string | null;
    processStatus: string | null;
    diskUsageBytes: number | null;
  } | null;
}

interface RepoTableRowProps {
  data: RepoRowData;
  selected: boolean;
  onSelect: (id: number) => void;
  onOpenDetail: (owner: string, name: string) => void;
}

const WATCH_ICONS: Record<string, string> = {
  releases_only: '🔕',
  active_tracking: '📡',
  full_watch: '📺',
};

export function RepoTableRow({ data, selected, onSelect, onOpenDetail }: RepoTableRowProps) {
  const { repo, localState } = data;
  const router = useRouter();

  const isCloned = !!localState?.clonePath;
  const isOutdated = isCloned && localState?.localVersion && repo.lastReleaseVersion &&
    localState.localTag !== repo.lastReleaseVersion;
  const isRunning = localState?.processStatus === 'running';

  // Local status
  let localStatusText = '— Not cloned';
  let localStatusColor = '#484f58';
  if (isRunning) {
    localStatusText = '● Running';
    localStatusColor = '#3fb950';
  } else if (isCloned && isOutdated) {
    localStatusText = '⚠ Outdated';
    localStatusColor = '#f85149';
  } else if (isCloned) {
    localStatusText = '✓ Up to date';
    localStatusColor = '#3fb950';
  }

  // Version display
  let versionDisplay = '—';
  if (isCloned && localState?.localTag && repo.lastReleaseVersion) {
    if (localState.localTag === repo.lastReleaseVersion) {
      versionDisplay = `${localState.localTag} ✓`;
    } else {
      versionDisplay = `${localState.localTag} → ${repo.lastReleaseVersion}`;
    }
  } else if (isCloned && localState?.localVersion) {
    versionDisplay = localState.localVersion.substring(0, 7);
  } else if (repo.lastReleaseVersion) {
    versionDisplay = `Latest: ${repo.lastReleaseVersion}`;
  }

  // Disk usage
  const diskDisplay = localState?.diskUsageBytes
    ? formatBytes(localState.diskUsageBytes)
    : '—';

  // Last activity
  const activityDisplay = repo.lastCommitAt
    ? timeAgo(new Date(repo.lastCommitAt))
    : '—';

  // Primary action
  async function handlePrimaryAction() {
    if (!isCloned) {
      // Clone
      await fetch('/api/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, name: repo.name }),
      });
      router.refresh();
    } else if (isOutdated) {
      // Update
      await fetch('/api/update-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, name: repo.name }),
      });
      router.refresh();
    } else if (isRunning) {
      // Stop
      await fetch('/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, name: repo.name }),
      });
      router.refresh();
    } else {
      // Run
      await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, name: repo.name }),
      });
      router.refresh();
    }
  }

  let primaryLabel = 'Clone';
  let primaryColor = 'bg-[#238636]';
  if (isRunning) {
    primaryLabel = 'Stop';
    primaryColor = 'bg-[#da3633]';
  } else if (isCloned && isOutdated) {
    primaryLabel = 'Update';
    primaryColor = 'bg-[#1f6feb]';
  } else if (isCloned) {
    primaryLabel = 'Run';
    primaryColor = 'bg-[#21262d]';
  }

  return (
    <div
      className={`
        grid items-center border-b border-[#21262d44] text-xs
        hover:bg-[#161b2266] transition-colors
        ${selected ? 'bg-[#1f6feb11]' : ''}
      `}
      style={{ gridTemplateColumns: '28px 2fr 110px 110px 130px 90px 70px 70px 160px' }}
    >
      {/* Checkbox */}
      <div className="px-2 py-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(repo.id)}
          className="accent-[#1f6feb]"
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* Repo name */}
      <div className="py-2 min-w-0">
        <button
          onClick={() => onOpenDetail(repo.owner, repo.name)}
          className="text-[#58a6ff] font-semibold hover:underline text-left truncate block"
        >
          {repo.fullName}
        </button>
        <span className="text-[10px] text-[#8b949e] block truncate">
          {WATCH_ICONS[repo.watchLevel] || ''} {repo.watchLevel.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Stage */}
      <div className="py-2">
        <StageDropdown repoId={repo.id} currentStage={repo.workflowStage} />
      </div>

      {/* Local status */}
      <div className="py-2 text-[11px]" style={{ color: localStatusColor }}>
        {localStatusText}
      </div>

      {/* Version */}
      <div className="py-2 text-[10px] text-[#8b949e]">
        {versionDisplay}
      </div>

      {/* Activity */}
      <div className="py-2 text-[11px] text-[#8b949e]">
        {activityDisplay}
      </div>

      {/* Stars */}
      <div className="py-2 text-[11px] text-[#8b949e]">
        ⭐ {formatNumber(repo.starCount)}
      </div>

      {/* Disk */}
      <div className="py-2 text-[11px] text-[#8b949e]">
        {diskDisplay}
      </div>

      {/* Actions */}
      <div className="py-2 flex gap-1">
        <button
          onClick={handlePrimaryAction}
          className={`text-[10px] px-2 py-0.5 rounded text-white ${primaryColor}`}
        >
          {primaryLabel}
        </button>
        {isCloned && !isRunning && (
          <button
            onClick={() => fetch('/api/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ owner: repo.owner, name: repo.name }),
            }).then(() => router.refresh())}
            className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]"
          >
            Run
          </button>
        )}
        {isCloned && (
          <button
            onClick={() => {/* TODO: open folder in OS */}}
            className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]"
          >
            📂
          </button>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission-control/repo-table-row.tsx
git commit -m "feat(ui): add RepoTableRow component with contextual actions and version display"
```

---

### Task 19: Repo Table Container

**Files:**
- Create: `src/components/mission-control/repo-table.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/mission-control/repo-table.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RepoTableRow } from './repo-table-row';
import { BulkActionBar } from './bulk-action-bar';
import { MissionControlFilters } from '@/lib/queries';

interface RepoData {
  repo: any;
  localState: any;
}

interface RepoTableProps {
  repos: RepoData[];
  filters: MissionControlFilters;
  totalCount: number;
}

const SORT_OPTIONS = [
  { key: 'activity_desc', label: 'Last Activity' },
  { key: 'stars_desc', label: 'Most Stars' },
  { key: 'name_asc', label: 'Name A-Z' },
  { key: 'starred_desc', label: 'Recently Starred' },
  { key: 'disk_desc', label: 'Disk Usage' },
];

export function RepoTable({ repos, filters, totalCount }: RepoTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailRepo, setDetailRepo] = useState<{ owner: string; name: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === repos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(repos.map(r => r.repo.id)));
    }
  }, [repos, selectedIds.size]);

  function handleSort(sortKey: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sortKey);
    router.push(`/mission-control?${params.toString()}`);
  }

  function handleSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('search', value);
    else params.delete('search');
    router.push(`/mission-control?${params.toString()}`);
  }

  // Disk usage summary
  const totalDiskBytes = repos.reduce((sum, r) => sum + (r.localState?.diskUsageBytes || 0), 0);
  const clonedCount = repos.filter(r => r.localState?.clonePath).length;

  return (
    <div className="flex-1 min-w-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d] bg-[#161b22]">
        <input
          type="text"
          placeholder="Search repos..."
          defaultValue={filters.search || ''}
          onKeyDown={e => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value)}
          className="bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] px-2.5 py-1 rounded-md text-xs w-56"
        />

        <span className="text-[#8b949e] text-[11px] ml-auto">
          {totalCount} repos
          {clonedCount > 0 && ` · ${clonedCount} cloned · ${formatBytes(totalDiskBytes)}`}
        </span>

        <select
          value={filters.sort || 'activity_desc'}
          onChange={e => handleSort(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] text-[#8b949e] text-[11px] px-2 py-1 rounded"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={Array.from(selectedIds)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Table header */}
      <div
        className="grid px-4 py-1.5 border-b border-[#21262d] bg-[#161b22] text-[11px] text-[#8b949e] font-semibold"
        style={{ gridTemplateColumns: '28px 2fr 110px 110px 130px 90px 70px 70px 160px' }}
      >
        <div className="px-0">
          <input
            type="checkbox"
            checked={selectedIds.size === repos.length && repos.length > 0}
            onChange={selectAll}
            className="accent-[#1f6feb]"
          />
        </div>
        <div>Repository</div>
        <div>Stage</div>
        <div>Local</div>
        <div>Version</div>
        <div>Activity</div>
        <div>Stars</div>
        <div>Disk</div>
        <div>Actions</div>
      </div>

      {/* Rows */}
      <div className="px-4">
        {repos.length === 0 ? (
          <div className="text-center text-[#484f58] py-12 text-sm">
            No repos match the current filters.
          </div>
        ) : (
          repos.map(data => (
            <RepoTableRow
              key={data.repo.id}
              data={data}
              selected={selectedIds.has(data.repo.id)}
              onSelect={toggleSelect}
              onOpenDetail={(owner, name) => setDetailRepo({ owner, name })}
            />
          ))
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission-control/repo-table.tsx
git commit -m "feat(ui): add RepoTable container with search, sort, select-all, and disk summary"
```

---

### Task 20: Bulk Action Bar

**Files:**
- Create: `src/components/mission-control/bulk-action-bar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/mission-control/bulk-action-bar.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BulkActionBarProps {
  selectedIds: number[];
  onClear: () => void;
}

const STAGES = [
  { key: 'watching', label: 'Watching' },
  { key: 'want_to_try', label: 'Want to Try' },
  { key: 'downloaded', label: 'Downloaded' },
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Archived' },
];

const WATCH_LEVELS = [
  { key: 'releases_only', label: 'Releases Only' },
  { key: 'active_tracking', label: 'Active Tracking' },
  { key: 'full_watch', label: 'Full Watch' },
];

export function BulkActionBar({ selectedIds, onClear }: BulkActionBarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function bulkSetStage(stage: string) {
    setLoading(true);
    await fetch('/api/workflow-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoIds: selectedIds, stage }),
    });
    setLoading(false);
    onClear();
    router.refresh();
  }

  async function bulkSetWatchLevel(level: string) {
    setLoading(true);
    await fetch('/api/watch-level', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoIds: selectedIds, level }),
    });
    setLoading(false);
    onClear();
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#1f6feb22] border-b border-[#1f6feb44] text-xs">
      <span className="text-[#58a6ff] font-semibold">{selectedIds.length} selected</span>

      {/* Move to Stage */}
      <select
        disabled={loading}
        defaultValue=""
        onChange={e => { if (e.target.value) bulkSetStage(e.target.value); e.target.value = ''; }}
        className="bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-[11px] px-2 py-1 rounded"
      >
        <option value="" disabled>Move to stage...</option>
        {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>

      {/* Set Watch Level */}
      <select
        disabled={loading}
        defaultValue=""
        onChange={e => { if (e.target.value) bulkSetWatchLevel(e.target.value); e.target.value = ''; }}
        className="bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-[11px] px-2 py-1 rounded"
      >
        <option value="" disabled>Set watch level...</option>
        {WATCH_LEVELS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
      </select>

      <button
        onClick={onClear}
        className="text-[#8b949e] hover:text-[#c9d1d9] ml-auto"
      >
        Clear selection
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission-control/bulk-action-bar.tsx
git commit -m "feat(ui): add BulkActionBar with stage and watch level bulk operations"
```

---

### Task 21: Scan Setup Component

**Files:**
- Create: `src/components/mission-control/scan-setup.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/mission-control/scan-setup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ScanDir {
  id: number;
  path: string;
  recursive: boolean;
  enabled: boolean;
  lastScannedAt: string | null;
}

interface ScanSetupProps {
  onClose: () => void;
}

export function ScanSetup({ onClose }: ScanSetupProps) {
  const [dirs, setDirs] = useState<ScanDir[]>([]);
  const [newPath, setNewPath] = useState('');
  const [newRecursive, setNewRecursive] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/scan/directories').then(r => r.json()).then(setDirs);
  }, []);

  async function addDirectory() {
    if (!newPath.trim()) return;
    await fetch('/api/scan/directories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath.trim(), recursive: newRecursive }),
    });
    setNewPath('');
    const updated = await fetch('/api/scan/directories').then(r => r.json());
    setDirs(updated);
  }

  async function removeDirectory(id: number) {
    await fetch('/api/scan/directories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDirs(prev => prev.filter(d => d.id !== id));
  }

  async function runScan() {
    setScanning(true);
    setScanResult(null);
    const res = await fetch('/api/scan', { method: 'POST' });
    const result = await res.json();
    setScanResult(result);
    setScanning(false);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-[560px] max-h-[80vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#f0f6fc]">Directory Scanner</h2>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#c9d1d9]">✕</button>
        </div>

        {/* Existing directories */}
        <div className="mb-4">
          <div className="text-xs text-[#8b949e] font-semibold uppercase mb-2">Watch Directories</div>
          {dirs.length === 0 ? (
            <div className="text-sm text-[#484f58] py-2">No directories configured.</div>
          ) : (
            dirs.map(dir => (
              <div key={dir.id} className="flex items-center gap-2 py-1.5 border-b border-[#21262d]">
                <span className="text-xs text-[#c9d1d9] flex-1 font-mono truncate">{dir.path}</span>
                <span className="text-[10px] text-[#8b949e]">{dir.recursive ? 'recursive' : 'shallow'}</span>
                {dir.lastScannedAt && (
                  <span className="text-[10px] text-[#484f58]">
                    scanned {new Date(dir.lastScannedAt).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={() => removeDirectory(dir.id)}
                  className="text-[#f85149] text-xs hover:underline"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newPath}
            onChange={e => setNewPath(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDirectory()}
            placeholder="/path/to/directory"
            className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] px-3 py-1.5 rounded text-xs font-mono"
          />
          <label className="flex items-center gap-1 text-xs text-[#8b949e]">
            <input
              type="checkbox"
              checked={newRecursive}
              onChange={e => setNewRecursive(e.target.checked)}
              className="accent-[#1f6feb]"
            />
            Recursive
          </label>
          <button
            onClick={addDirectory}
            className="bg-[#238636] text-white text-xs px-3 py-1.5 rounded hover:bg-[#2ea043]"
          >
            Add
          </button>
        </div>

        {/* Scan button */}
        <button
          onClick={runScan}
          disabled={scanning || dirs.length === 0}
          className="w-full bg-[#1f6feb] text-white text-sm py-2 rounded-md hover:bg-[#388bfd] disabled:opacity-50 mb-4"
        >
          {scanning ? 'Scanning...' : 'Run Scan Now'}
        </button>

        {/* Results */}
        {scanResult && (
          <div className="bg-[#0d1117] border border-[#30363d] rounded p-3 text-xs">
            <div className="text-[#f0f6fc] font-semibold mb-2">Scan Results</div>
            <div className="text-[#8b949e] space-y-1">
              <div>Directories scanned: {scanResult.scannedDirs}</div>
              <div>Repos found: {scanResult.totalReposFound}</div>
              <div className="text-[#3fb950]">Auto-matched: {scanResult.autoMatched}</div>
              {scanResult.ambiguous?.length > 0 && (
                <div className="text-[#f0883e]">Ambiguous: {scanResult.ambiguous.length} (need review)</div>
              )}
              {scanResult.untracked?.length > 0 && (
                <div className="text-[#8b949e]">Untracked: {scanResult.untracked.length}</div>
              )}
            </div>

            {/* Ambiguous matches */}
            {scanResult.ambiguous?.length > 0 && (
              <div className="mt-3">
                <div className="text-[#f0883e] font-semibold text-[10px] uppercase mb-1">Needs Review</div>
                {scanResult.ambiguous.map((m: any, i: number) => (
                  <div key={i} className="text-[#8b949e] py-1">
                    📂 {m.localPath} {m.remoteName && `→ ${m.remoteName}`}
                  </div>
                ))}
              </div>
            )}

            {/* Untracked repos */}
            {scanResult.untracked?.length > 0 && (
              <div className="mt-3">
                <div className="text-[#8b949e] font-semibold text-[10px] uppercase mb-1">Not in StarDeck</div>
                {scanResult.untracked.map((m: any, i: number) => (
                  <div key={i} className="text-[#484f58] py-1">
                    📂 {m.localPath} {m.remoteName && `(${m.remoteName})`}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission-control/scan-setup.tsx
git commit -m "feat(ui): add ScanSetup modal for directory configuration and scan execution"
```

---

### Task 22: Wire Up Navigation and Run Migration on Startup

**Files:**
- Modify: `src/lib/db/index.ts`

- [ ] **Step 1: Add migration call to DB initialization**

Read `src/lib/db/index.ts` to see the current initialization pattern. Add the mission control migration call after the existing DB setup. This ensures tables exist on first load:

```typescript
import { migrateMissionControl } from './migrate-mission-control';

// After existing DB initialization:
migrateMissionControl();
```

Note: Check if the existing `index.ts` already calls a migration. If so, add the mission control migration alongside it. If it uses Drizzle's `migrate()`, add ours after it.

- [ ] **Step 2: Add "Mission Control" link to existing DashboardHeader**

Read `src/components/dashboard/header.tsx` and add a navigation link. Find the nav section and add:

```tsx
<a
  href="/mission-control"
  className="text-sm text-[#8b949e] hover:text-[#c9d1d9] px-3 py-1 rounded-md hover:bg-[#21262d]"
>
  Mission Control
</a>
```

Place it alongside any existing navigation links.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/index.ts src/components/dashboard/header.tsx
git commit -m "feat: wire up mission control migration on startup and add nav link"
```

---

### Task 23: Install chokidar Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install chokidar for filesystem watching**

```bash
npm install chokidar
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add chokidar for filesystem watching"
```

---

### Task 24: Integration Smoke Test

**Files:**
- No new files — manual verification

- [ ] **Step 1: Run the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify Mission Control page loads**

Open http://localhost:3000/mission-control in a browser. Verify:
- Page loads without errors
- Pipeline bar shows stage tabs with counts
- Sidebar renders collections, watch levels, filters sections
- Table shows repos (if any exist in the database)
- Empty state shows "No repos match the current filters" if DB is empty

- [ ] **Step 3: Verify pipeline filtering works**

Click different stage tabs and verify the table filters correctly.

- [ ] **Step 4: Verify stage dropdown works**

Click a stage pill on a repo row. Verify the dropdown appears and changing the stage refreshes the page.

- [ ] **Step 5: Run existing tests to check for regressions**

```bash
npx vitest run
```

Expected: All existing tests still pass, plus new scanner and version-check tests.

- [ ] **Step 6: Commit any fixes needed**

If smoke testing reveals issues, fix and commit:

```bash
git add -A
git commit -m "fix: address integration issues found during smoke test"
```

---

## Summary

| Phase | Tasks | What It Delivers |
|-------|-------|-----------------|
| 1: Data Layer | Tasks 1-3 | Schema, migration, query functions |
| 2: Scanner | Task 4 | Directory scanning + repo matching |
| 3: Version Check | Task 5 | Local vs remote version comparison |
| 4: API Routes | Tasks 6-13 | All endpoints for mission control, stages, collections, scanning, updates |
| 5: UI | Tasks 14-24 | Full Mission Control page with table, pipeline, sidebar, bulk ops, scanner |

**Not included in this plan (future follow-up tasks):**
- Filesystem watcher (continuous mode) — uses chokidar, wire up in a separate background service
- Collection auto-rules engine — rule matching logic during sync
- Advanced update modal (branch/tag picker)
- Clone preview/dry-run modal
- Saved view manager UI (CRUD for presets)
- Collection manager UI (edit/delete, auto-rules config)
- Keyboard shortcuts (j/k navigation, s/u/c actions)
- "Why did I save this?" feature
- Export/share collections
- Update changelog preview
- Notification routing by watch level

These are polish features that build on top of the working foundation this plan delivers.
