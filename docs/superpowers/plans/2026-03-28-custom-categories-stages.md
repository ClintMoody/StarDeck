# Custom Categories & Workflow Stages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded workflow stages and auto-categories with DB-driven, user-editable versions — custom stages, editable categories with auto-sort, drag-drop reassignment, and settings management.

**Architecture:** Three new DB tables (`workflow_stages`, `categories`, `repo_categories`) replace the hardcoded `STAGES` array and `CATEGORY_DEFINITIONS`. A new `workflow_stage_id` FK on `starred_repos` replaces the text `workflow_stage` column (old column kept, ignored). Auto-sort engine reads category rules from DB. All UI components switch from hardcoded arrays to DB-fetched data passed through server components.

**Tech Stack:** Drizzle ORM + SQLite, Next.js 16 App Router (server components + client components), HTML5 Drag and Drop API.

**Spec:** `docs/superpowers/specs/2026-03-28-custom-categories-stages-design.md`

---

### Task 1: Schema — Add workflow_stages, categories, repo_categories tables

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `src/lib/db/seed-stages-categories.ts`
- Modify: `src/lib/db/migrate.ts`

- [ ] **Step 1: Add new tables to schema.ts**

Add these table definitions after the existing `scanDirectories` table in `src/lib/db/schema.ts`:

```typescript
// ─── Workflow Stages ───────────────────────────────────

export const workflowStages = sqliteTable('workflow_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  position: integer('position').notNull(),
  deletable: integer('deletable', { mode: 'boolean' }).notNull().default(true),
});

// ─── Categories ────────────────────────────────────────

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  position: integer('position').notNull(),
  autoRules: text('auto_rules'), // JSON: { keywords: string[] }
});

// ─── Repo Categories ───────────────────────────────────

export const repoCategories = sqliteTable('repo_categories', {
  repoId: integer('repo_id').notNull().references(() => starredRepos.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  isAuto: integer('is_auto', { mode: 'boolean' }).notNull().default(true),
}, (table) => [
  uniqueIndex('repo_categories_repo_idx').on(table.repoId),
]);
```

Also add `workflowStageId` to the existing `starredRepos` table definition:

```typescript
workflowStageId: integer('workflow_stage_id').references(() => workflowStages.id),
```

- [ ] **Step 2: Create seed file**

Create `src/lib/db/seed-stages-categories.ts`:

```typescript
import { db } from '@/lib/db';
import { workflowStages, categories } from './schema';

const DEFAULT_STAGES = [
  { name: 'Watching', icon: '👁', color: '#8b949e', position: 0, deletable: false },
  { name: 'Want to Try', icon: '🧪', color: '#d2a8ff', position: 1, deletable: false },
  { name: 'Downloaded', icon: '📦', color: '#58a6ff', position: 2, deletable: false },
  { name: 'Active', icon: '🚀', color: '#f0883e', position: 3, deletable: false },
  { name: 'Archived', icon: '📁', color: '#484f58', position: 4, deletable: false },
];

const DEFAULT_CATEGORIES = [
  { name: 'AI & Agents', icon: '🤖', color: '#d2a8ff', position: 0, autoRules: JSON.stringify({ keywords: ["ai-agent","ai-agents","ai-tools","ai-assistant","ai-security-tool","agentic-ai","agentic-engineering","agentic-framework","agentic-workflow","artificial-intelligence","machine-learning","deep-learning","large-language-models","llm-inference","multi-agent","multi-agent-system","multi-agent-systems","autonomous-agents","swarm-intelligence","langchain","langgraph","llamaindex","anthropic","anthropic-claude","claude-code","claude-skills","openclaw","openclaw-skills","codex","codex-skills","openai","llm","gpt","claude","agentic","embedding","transformer","diffusion","chatbot","neural","generative","model-context-protocol","mcp-server","deep-research","superagent","swarm","mlx"] }) },
  { name: 'Security & OSINT', icon: '🔒', color: '#f85149', position: 1, autoRules: JSON.stringify({ keywords: ["security","hacking","pentest","penetration-testing","penetration-testing-tools","exploit","vulnerability","cve","ctf","red-team","offensive-security","defensive","malware","reverse-engineering","forensics","osint","osint-tool","osint-resources","reconnaissance","bug-bounty","infosec","cybersecurity","security-automation","security-testing","security-tools","ai-security","dlp","ssrf-protection","egress-proxy","encryption","aes-256","cryptography","cctv","cctv-cameras","sattelite","sattelite-imagery","elonjet","airforce1"] }) },
  { name: 'Developer Tools', icon: '🛠️', color: '#3fb950', position: 2, autoRules: JSON.stringify({ keywords: ["developer-tools","devtools","command-line","terminal","linter","formatter","bundler","compiler","debugger","profiler","test-framework","ci-cd","version-control","package-manager","build-tool","code-quality","static-analysis","claude-code-plugin","claude-code-skills","context-engineering","meta-prompting","spec-driven-development","vibe-coding","coding","token-savings","token"] }) },
  { name: 'Automation & Browser', icon: '🌐', color: '#1f6feb', position: 3, autoRules: JSON.stringify({ keywords: ["automation","browser-automation","scraping","scraper","crawler","selenium","puppeteer","playwright","web-scraping","workflow","orchestration","browser-use"] }) },
  { name: 'Audio & Music', icon: '🎵', color: '#f0883e', position: 4, autoRules: JSON.stringify({ keywords: ["audio","audio-analysis","audio-plugin","audio-visualizer","music","vst","vst3","juce","juce-framework","juce-plugin","daw","synthesizer","midi","sound","spectral","signal","spl","acoustics","sample","visualizer"] }) },
  { name: 'Knowledge & Memory', icon: '📚', color: '#a371f7', position: 5, autoRules: JSON.stringify({ keywords: ["knowledge","knowledge-graph","notes","obsidian","brain","brain-map","memory","ai-memory","memory-system","memory-layer","long-term-memory","memory-engine","research","paper","arxiv","academic","personal-knowledge","personal-knowledge-management","open-brain"] }) },
  { name: 'Geolocation & Maps', icon: '🗺️', color: '#3fb950', position: 6, autoRules: JSON.stringify({ keywords: ["geolocation","gps","navigation","maps","offline-maps","mgrs","military-grid","land-navigation","street-level","satellite","mapping","tactical","hiking","search-and-rescue"] }) },
  { name: 'Mobile & Desktop', icon: '📱', color: '#58a6ff', position: 7, autoRules: JSON.stringify({ keywords: ["mobile","ios","android","react-native","flutter","electron","tauri","desktop","cross-platform","dart"] }) },
  { name: 'Backend & Infra', icon: '⚙️', color: '#8b949e', position: 8, autoRules: JSON.stringify({ keywords: ["backend","server","graphql","grpc","database","nosql","redis","postgres","mongodb","supabase","docker","kubernetes","devops","infrastructure","aws","gcp","azure","serverless","microservices","self-hosted"] }) },
  { name: 'Other', icon: '📁', color: '#484f58', position: 9, autoRules: null },
];

const STAGE_KEY_MAP: Record<string, number> = {
  watching: 1,
  want_to_try: 2,
  downloaded: 3,
  active: 4,
  archived: 5,
};

export function seedStagesAndCategories() {
  // Only seed if tables are empty
  const existingStages = db.select().from(workflowStages).all();
  if (existingStages.length === 0) {
    for (const stage of DEFAULT_STAGES) {
      db.insert(workflowStages).values(stage).run();
    }
  }

  const existingCategories = db.select().from(categories).all();
  if (existingCategories.length === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      db.insert(categories).values(cat).run();
    }
  }
}

/** Map old text workflow_stage values to new workflow_stage_id FK */
export function migrateWorkflowStageIds() {
  const allStages = db.select().from(workflowStages).all();
  const stageNameToId = new Map(allStages.map(s => [s.name, s.id]));

  // Build mapping from old key to new ID
  const keyToId: Record<string, number> = {};
  for (const [key, seedPosition] of Object.entries(STAGE_KEY_MAP)) {
    const stage = allStages.find(s => s.position === seedPosition - 1);
    if (stage) keyToId[key] = stage.id;
  }

  // Update all repos that have the old text value but no FK
  const { starredRepos: sr } = require('./schema');
  const { eq, isNull } = require('drizzle-orm');
  const repos = db.select({ id: sr.id, workflowStage: sr.workflowStage }).from(sr).all();
  for (const repo of repos) {
    const stageId = keyToId[repo.workflowStage] ?? keyToId['watching'];
    if (stageId) {
      db.update(sr).set({ workflowStageId: stageId }).where(eq(sr.id, repo.id)).run();
    }
  }
}
```

- [ ] **Step 3: Update migrate.ts to run seeding**

In `src/lib/db/migrate.ts`, after the existing `migrate()` call, add:

```typescript
import { seedStagesAndCategories, migrateWorkflowStageIds } from './seed-stages-categories';

// After the existing migrate() call:
try {
  seedStagesAndCategories();
  migrateWorkflowStageIds();
} catch (e: any) {
  const msg = e?.message || '';
  if (!msg.includes('already exists') && !msg.includes('duplicate')) {
    console.error('Seed/migrate error:', msg);
  }
}
```

- [ ] **Step 4: Generate and apply the Drizzle migration**

Run:
```bash
npx drizzle-kit generate
```

This creates `drizzle/0004_*.sql`. Verify it contains CREATE TABLE for `workflow_stages`, `categories`, `repo_categories`, and ALTER TABLE for `starred_repos` adding `workflow_stage_id`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/seed-stages-categories.ts src/lib/db/migrate.ts drizzle/
git commit -m "feat: add workflow_stages, categories, repo_categories tables with seed data"
```

---

### Task 2: Queries — Add DB queries for stages, categories, repo_categories

**Files:**
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Add stage queries**

Add to the bottom of `src/lib/queries.ts`:

```typescript
// ---- Workflow Stage Queries ----

export function getAllWorkflowStages() {
  return db.select().from(workflowStages).orderBy(asc(workflowStages.position)).all();
}

export function createWorkflowStage(data: { name: string; icon: string; color: string }) {
  const maxPos = db.select({ max: sql<number>`max(${workflowStages.position})` }).from(workflowStages).get();
  const position = (maxPos?.max ?? -1) + 1;
  return db.insert(workflowStages).values({ ...data, position, deletable: true }).returning().get();
}

export function updateWorkflowStage(id: number, data: Partial<{ name: string; icon: string; color: string; position: number }>) {
  return db.update(workflowStages).set(data).where(eq(workflowStages.id, id)).run();
}

export function deleteWorkflowStage(id: number, reassignToId: number) {
  db.update(starredRepos).set({ workflowStageId: reassignToId }).where(eq(starredRepos.workflowStageId, id)).run();
  return db.delete(workflowStages).where(eq(workflowStages.id, id)).run();
}
```

- [ ] **Step 2: Add category queries**

```typescript
// ---- Category Queries (DB-driven) ----

export function getAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.position)).all();
}

export function createCategory(data: { name: string; icon: string; color: string; autoRules?: string | null }) {
  const maxPos = db.select({ max: sql<number>`max(${categories.position})` }).from(categories).get();
  const position = (maxPos?.max ?? -1) + 1;
  return db.insert(categories).values({ ...data, position }).returning().get();
}

export function updateCategory(id: number, data: Partial<{ name: string; icon: string; color: string; position: number; autoRules: string | null }>) {
  return db.update(categories).set(data).where(eq(categories.id, id)).run();
}

export function deleteCategory(id: number) {
  const other = db.select().from(categories).where(eq(categories.name, 'Other')).get();
  if (other && other.id !== id) {
    db.update(repoCategories).set({ categoryId: other.id, isAuto: false }).where(eq(repoCategories.categoryId, id)).run();
  } else {
    db.delete(repoCategories).where(eq(repoCategories.categoryId, id)).run();
  }
  return db.delete(categories).where(eq(categories.id, id)).run();
}
```

- [ ] **Step 3: Add repo-category queries**

```typescript
// ---- Repo Category Assignment ----

export function getRepoCategory(repoId: number) {
  return db.select({ categoryId: repoCategories.categoryId, isAuto: repoCategories.isAuto })
    .from(repoCategories)
    .where(eq(repoCategories.repoId, repoId))
    .get();
}

export function setRepoCategory(repoId: number, categoryId: number, isAuto: boolean) {
  const existing = getRepoCategory(repoId);
  if (existing) {
    db.update(repoCategories)
      .set({ categoryId, isAuto })
      .where(eq(repoCategories.repoId, repoId))
      .run();
  } else {
    db.insert(repoCategories).values({ repoId, categoryId, isAuto }).run();
  }
}

export function getRepoCategoryCounts() {
  return db.select({
    categoryId: repoCategories.categoryId,
    count: count(),
  })
  .from(repoCategories)
  .groupBy(repoCategories.categoryId)
  .all();
}

export function getReposByCategory(categoryId: number) {
  return db.select({ repo: starredRepos })
    .from(starredRepos)
    .innerJoin(repoCategories, eq(repoCategories.repoId, starredRepos.id))
    .where(and(eq(repoCategories.categoryId, categoryId), eq(starredRepos.unstarred, false)))
    .all()
    .map(r => r.repo);
}
```

- [ ] **Step 4: Add imports for new tables at the top of queries.ts**

Add to the existing import from `@/lib/db/schema`:

```typescript
import { ..., workflowStages, categories, repoCategories } from "@/lib/db/schema";
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: add DB queries for workflow stages, categories, repo categories"
```

---

### Task 3: Auto-sort engine — Rewrite categories.ts to read from DB

**Files:**
- Modify: `src/lib/categories.ts`

- [ ] **Step 1: Rewrite categorizeRepo to read from DB**

Replace the entire contents of `src/lib/categories.ts`:

```typescript
import { db } from '@/lib/db';
import { categories, repoCategories, starredRepos } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export interface CategoryCount {
  name: string;
  icon: string;
  count: number;
  id: number;
}

interface AutoRules {
  keywords: string[];
}

/**
 * Categorize a single repo using DB-stored category rules.
 * Returns the matched category IDs. Falls back to "Other".
 */
export function categorizeRepo(
  repo: { topics: string | null; description: string | null; fullName: string; language: string | null },
  allCategories: { id: number; name: string; autoRules: string | null }[]
): number[] {
  const topics: string[] = repo.topics ? JSON.parse(repo.topics) : [];
  const topicsLower = new Set(topics.map(t => t.toLowerCase()));

  const freeText = [
    repo.description ?? '',
    repo.fullName.replace(/[/\-_]/g, ' '),
    repo.language ?? '',
  ].join(' ').toLowerCase();

  const matched: number[] = [];

  for (const cat of allCategories) {
    if (!cat.autoRules) continue;
    let rules: AutoRules;
    try { rules = JSON.parse(cat.autoRules); } catch { continue; }
    if (!rules.keywords?.length) continue;

    const hasMatch = rules.keywords.some(kw => {
      if (topicsLower.has(kw)) return true;
      if (kw.includes('-') && topics.some(t => t.toLowerCase().includes(kw))) return true;
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return re.test(freeText);
    });

    if (hasMatch) matched.push(cat.id);
  }

  if (matched.length === 0) {
    const other = allCategories.find(c => c.name === 'Other');
    if (other) return [other.id];
  }

  return matched;
}

/**
 * Run auto-sort on all repos that have is_auto = true or no category.
 * Does NOT touch manually assigned repos.
 */
export function runAutoSort() {
  const allCats = db.select().from(categories).all();
  const allRepos = db.select().from(starredRepos).where(eq(starredRepos.unstarred, false)).all();

  let updated = 0;

  for (const repo of allRepos) {
    // Check if manually assigned
    const existing = db.select().from(repoCategories).where(eq(repoCategories.repoId, repo.id)).get();
    if (existing && !existing.isAuto) continue;

    const matchedIds = categorizeRepo(repo, allCats);
    const primaryId = matchedIds[0];
    if (!primaryId) continue;

    if (existing) {
      if (existing.categoryId !== primaryId) {
        db.update(repoCategories)
          .set({ categoryId: primaryId, isAuto: true })
          .where(eq(repoCategories.repoId, repo.id))
          .run();
        updated++;
      }
    } else {
      db.insert(repoCategories).values({ repoId: repo.id, categoryId: primaryId, isAuto: true }).run();
      updated++;
    }
  }

  return { total: allRepos.length, updated };
}

/**
 * Get category counts for sidebar/dashboard display.
 */
export function getCategoryCounts(
  repos?: { topics: string | null; description: string | null; fullName: string; language: string | null }[]
): CategoryCount[] {
  const allCats = db.select().from(categories).all();

  // Count from repo_categories join
  const counts = new Map<number, number>();
  const rows = db.select({ categoryId: repoCategories.categoryId })
    .from(repoCategories)
    .innerJoin(starredRepos, and(eq(starredRepos.id, repoCategories.repoId), eq(starredRepos.unstarred, false)))
    .all();

  for (const row of rows) {
    counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + 1);
  }

  return allCats
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      count: counts.get(cat.id) ?? 0,
    }))
    .filter(c => c.count > 0 || c.name === 'Other')
    .sort((a, b) => b.count - a.count);
}

/**
 * Get repos for a specific category (used by dashboard sections).
 */
export function getReposByCategoryName(categoryName: string) {
  const cat = db.select().from(categories).where(eq(categories.name, categoryName)).get();
  if (!cat) return [];

  return db.select({ repo: starredRepos })
    .from(starredRepos)
    .innerJoin(repoCategories, eq(repoCategories.repoId, starredRepos.id))
    .where(and(eq(repoCategories.categoryId, cat.id), eq(starredRepos.unstarred, false)))
    .all()
    .map(r => r.repo);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/categories.ts
git commit -m "feat: rewrite auto-sort engine to read category rules from DB"
```

---

### Task 4: API endpoints — Stages, Categories, Repo Category

**Files:**
- Create: `src/app/api/workflow-stages/route.ts`
- Create: `src/app/api/categories/route.ts`
- Modify: `src/app/api/categories/[id]/route.ts` (new)
- Create: `src/app/api/repo-category/route.ts`
- Create: `src/app/api/repo-category/auto-sort/route.ts`
- Modify: `src/app/api/workflow-stage/route.ts` (existing — update to use ID)

- [ ] **Step 1: Create workflow-stages CRUD endpoint**

Create `src/app/api/workflow-stages/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllWorkflowStages, createWorkflowStage, updateWorkflowStage, deleteWorkflowStage } from '@/lib/queries';
import { db } from '@/lib/db';
import { workflowStages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getAllWorkflowStages());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, icon, color } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const stage = createWorkflowStage({ name, icon: icon || '📌', color: color || '#8b949e' });
  return NextResponse.json(stage);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  updateWorkflowStage(id, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, reassignToId } = await req.json();
  if (!id || !reassignToId) return NextResponse.json({ error: 'id and reassignToId required' }, { status: 400 });

  const stage = db.select().from(workflowStages).where(eq(workflowStages.id, id)).get();
  if (stage && !stage.deletable) return NextResponse.json({ error: 'Cannot delete default stage' }, { status: 400 });

  deleteWorkflowStage(id, reassignToId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create categories CRUD endpoint**

Create `src/app/api/categories/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/lib/queries';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getAllCategories());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, icon, color, autoRules } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const cat = createCategory({ name, icon: icon || '📁', color: color || '#8b949e', autoRules: autoRules || null });
  return NextResponse.json(cat);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  updateCategory(id, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  deleteCategory(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create repo-category assignment endpoint**

Create `src/app/api/repo-category/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { setRepoCategory } from '@/lib/queries';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { repoId, categoryId } = await req.json();
  if (!repoId || !categoryId) return NextResponse.json({ error: 'repoId and categoryId required' }, { status: 400 });

  setRepoCategory(repoId, categoryId, false);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Create auto-sort endpoint**

Create `src/app/api/repo-category/auto-sort/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { runAutoSort } from '@/lib/categories';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = runAutoSort();
  return NextResponse.json(result);
}
```

- [ ] **Step 5: Update existing workflow-stage endpoint to accept ID**

In `src/app/api/workflow-stage/route.ts`, update the POST handler to accept `stageId` (integer) in addition to the old `stage` (text). The handler should call:

```typescript
// Accept either stageId (new) or stage text (backwards compat)
const { repoIds, stage, stageId } = await req.json();
if (stageId) {
  return db.update(starredRepos)
    .set({ workflowStageId: stageId })
    .where(inArray(starredRepos.id, repoIds))
    .run();
}
// Fallback: old text-based assignment (kept for compat during migration)
return updateWorkflowStage(repoIds, stage);
```

- [ ] **Step 6: Run auto-sort in sync flow**

In `src/lib/sync.ts`, add after the existing starred repos sync (before the sync log insert):

```typescript
import { runAutoSort } from '@/lib/categories';

// After syncing repos, run auto-sort for category assignment
try {
  runAutoSort();
} catch {
  // Non-fatal — categories are a convenience feature
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/workflow-stages/ src/app/api/categories/ src/app/api/repo-category/ src/app/api/workflow-stage/route.ts src/lib/sync.ts
git commit -m "feat: add API endpoints for stages, categories, repo-category, auto-sort"
```

---

### Task 5: Mission Control — DB-driven stage dropdown + category column

**Files:**
- Modify: `src/app/mission-control/page.tsx`
- Modify: `src/components/mission-control/stage-dropdown.tsx`
- Create: `src/components/mission-control/category-dropdown.tsx`
- Modify: `src/components/mission-control/repo-table.tsx`
- Modify: `src/components/mission-control/repo-table-row.tsx`
- Modify: `src/components/mission-control/pipeline-bar.tsx`

- [ ] **Step 1: Pass stages and categories from server component**

In `src/app/mission-control/page.tsx`, add to the data fetching:

```typescript
import { getAllWorkflowStages, getAllCategories, getRepoCategoryCounts } from '@/lib/queries';

// In the Promise.all:
const [repos, stageCounts, collections, collectionCounts, savedViews, tags, stages, allCategories, categoryCounts] = await Promise.all([
  getMissionControlRepos(filters),
  getStageCounts(),
  getAllCollections(),
  getCollectionCounts(),
  getAllSavedViews(),
  getAllTags(),
  getAllWorkflowStages(),
  getAllCategories(),
  getRepoCategoryCounts(),
]);
```

Pass `stages` and `allCategories` down to `<RepoTable>`, `<PipelineBar>`, and `<MCSidebar>` as props.

- [ ] **Step 2: Rewrite stage-dropdown.tsx to read from props**

Replace the hardcoded `STAGES` array with a prop:

```typescript
interface StageDropdownProps {
  repoId: number;
  currentStageId: number | null;
  stages: { id: number; name: string; icon: string; color: string }[];
}

export function StageDropdown({ repoId, currentStageId, stages }: StageDropdownProps) {
  // ... same logic but uses stages prop instead of hardcoded STAGES
  // changeStage sends stageId instead of text key
  // Add "+ Add Stage" at bottom of dropdown
}
```

The "+ Add Stage" button shows an inline input. On submit, it calls `POST /api/workflow-stages` with `{ name }`, then `router.refresh()`.

- [ ] **Step 3: Create category-dropdown.tsx**

Create `src/components/mission-control/category-dropdown.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CategoryDropdownProps {
  repoId: number;
  currentCategoryId: number | null;
  isAuto: boolean;
  categories: { id: number; name: string; icon: string; color: string }[];
}

export function CategoryDropdown({ repoId, currentCategoryId, isAuto, categories }: CategoryDropdownProps) {
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

  const current = categories.find(c => c.id === currentCategoryId);

  async function changeCategory(categoryId: number) {
    setOpen(false);
    await fetch('/api/repo-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoId, categoryId }),
    });
    router.refresh();
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-[11px] px-2 py-0.5 rounded-full border border-[#30363d] hover:border-[#8b949e] transition-colors"
        style={{ color: current?.color ?? '#484f58' }}
      >
        {current ? `${current.icon} ${current.name}` : '—'}
        {isAuto && current && <span className="ml-1 opacity-40 text-[9px]">auto</span>}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg py-1 min-w-[180px]">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => changeCategory(cat.id)}
              className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[#21262d] transition-colors ${
                cat.id === currentCategoryId ? 'text-[#f0f6fc] font-semibold' : 'text-[#8b949e]'
              }`}
            >
              {cat.icon} {cat.name}
              {cat.id === currentCategoryId && ' ✓'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add category column to repo-table.tsx**

In the `DEFAULT_COLUMNS` array, add after `stage`:

```typescript
{ key: 'category', label: 'Category', width: 150, minWidth: 100, resizable: true },
```

- [ ] **Step 5: Render category in repo-table-row.tsx**

Add the `CategoryDropdown` to the row, in the grid cell for the category column. The row needs `categoryId`, `isAuto`, and `categories` props passed from the parent.

- [ ] **Step 6: Update pipeline-bar.tsx to read stages from props**

Replace the hardcoded `STAGES` array with a `stages` prop. Count repos by `workflowStageId` instead of the old text field.

- [ ] **Step 7: Commit**

```bash
git add src/app/mission-control/page.tsx src/components/mission-control/
git commit -m "feat: DB-driven stage dropdown + category column in Mission Control"
```

---

### Task 6: Dashboard — DB-driven sections with drag-drop + inline edit

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/dashboard/sectioned-view.tsx`
- Modify: `src/components/dashboard/sidebar.tsx`

- [ ] **Step 1: Update page.tsx to query categories from DB**

Replace the in-memory `buildSections()` function in `src/app/page.tsx`. Instead of calling `categorizeRepo()` per repo, query `repo_categories` joined with `categories` to build sections:

```typescript
import { getAllCategories } from '@/lib/queries';
import { db } from '@/lib/db';
import { repoCategories, categories as categoriesTable } from '@/lib/db/schema';

// Fetch categories and build sections from DB
const allCategories = getAllCategories();
const categoryRepoMap = new Map<number, typeof allRepos>();

// Get all repo-category assignments
const assignments = db.select({ repoId: repoCategories.repoId, categoryId: repoCategories.categoryId })
  .from(repoCategories).all();
const repoCatMap = new Map(assignments.map(a => [a.repoId, a.categoryId]));

for (const repo of allRepos) {
  const catId = repoCatMap.get(repo.id);
  if (catId) {
    if (!categoryRepoMap.has(catId)) categoryRepoMap.set(catId, []);
    categoryRepoMap.get(catId)!.push(repo);
  }
}

// Build sections from categories
const categorySections: RepoSection[] = allCategories
  .filter(cat => (categoryRepoMap.get(cat.id)?.length ?? 0) > 0 || cat.name === 'Other')
  .map(cat => ({
    id: `cat-${cat.id}`,
    title: cat.name,
    icon: cat.icon,
    repos: categoryRepoMap.get(cat.id) ?? [],
    type: 'category' as const,
    categoryId: cat.id,
  }));
```

Keep the "Active Now" and "Recently Starred" status sections as they are — they don't depend on categories.

- [ ] **Step 2: Add drag-drop to sectioned-view.tsx**

Add `categoryId` to the `RepoSection` interface:

```typescript
export interface RepoSection {
  id: string;
  title: string;
  icon: string;
  repos: Repo[];
  type: "status" | "recent" | "category";
  emptyMessage?: string;
  categoryId?: number;
}
```

Add drag handlers to repo cards in category sections:

```typescript
function handleDragStart(e: React.DragEvent, repoId: number) {
  e.dataTransfer.setData('repoId', String(repoId));
  e.dataTransfer.effectAllowed = 'move';
}

function handleDrop(e: React.DragEvent, targetCategoryId: number) {
  e.preventDefault();
  const repoId = parseInt(e.dataTransfer.getData('repoId'));
  if (!repoId || !targetCategoryId) return;
  fetch('/api/repo-category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoId, categoryId: targetCategoryId }),
  }).then(() => router.refresh());
}

function handleDragOver(e: React.DragEvent) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}
```

Apply `draggable`, `onDragStart` to repo cards in category sections. Apply `onDrop`, `onDragOver` to section containers. Add a visual indicator (border highlight) on dragover.

- [ ] **Step 3: Add inline section header editing**

On category section headers, add a pencil icon on hover. Click opens an inline text input pre-filled with the name. On Enter/blur, call `PATCH /api/categories` with the new name.

```typescript
const [editingSection, setEditingSection] = useState<string | null>(null);
const [editName, setEditName] = useState('');

async function saveHeaderName(categoryId: number) {
  await fetch('/api/categories', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: categoryId, name: editName }),
  });
  setEditingSection(null);
  router.refresh();
}
```

- [ ] **Step 4: Update sidebar.tsx category filter**

Replace the hardcoded category list with DB-driven categories (passed as props from `page.tsx`). Use the same `getCategoryCounts()` data.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/dashboard/sectioned-view.tsx src/components/dashboard/sidebar.tsx
git commit -m "feat: DB-driven dashboard sections with drag-drop and inline category editing"
```

---

### Task 7: Mission Control sidebar — Category filter

**Files:**
- Modify: `src/components/mission-control/mc-sidebar.tsx`
- Modify: `src/lib/queries.ts` (add categoryId filter to getMissionControlRepos)

- [ ] **Step 1: Add categoryId filter support to getMissionControlRepos**

In the `MissionControlFilters` interface, add `categoryId?: number`. In `getMissionControlRepos`, add:

```typescript
if (filters.categoryId) {
  const catRepoIds = db.select({ repoId: repoCategories.repoId })
    .from(repoCategories)
    .where(eq(repoCategories.categoryId, filters.categoryId));
  conditions.push(inArray(starredRepos.id, catRepoIds));
}
```

- [ ] **Step 2: Add categories section to mc-sidebar.tsx**

Add a new "Categories" section between "Collections" and "Watch Level". Receive `categories` and `categoryCounts` as props:

```typescript
{/* Categories */}
<div className="mb-4">
  <div className="text-[#8b949e] font-semibold uppercase text-[10px] mb-2">Categories</div>
  {categories.map(cat => (
    <button
      key={cat.id}
      onClick={() => navigateWithFilter('categoryId', activeFilters.categoryId === cat.id ? null : String(cat.id))}
      className={`block w-full text-left px-2 py-1 rounded transition-colors ${
        activeFilters.categoryId === cat.id ? 'text-[#c9d1d9] bg-[#1f6feb22]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
      }`}
    >
      <span>{cat.icon}</span> {cat.name}
      <span className="float-right opacity-50">{categoryCounts.get(cat.id) ?? 0}</span>
    </button>
  ))}
</div>
```

- [ ] **Step 3: Parse categoryId from search params in mission-control/page.tsx**

Add to the filters parsing:

```typescript
categoryId: params.categoryId ? Number(params.categoryId) : undefined,
```

- [ ] **Step 4: Commit**

```bash
git add src/components/mission-control/mc-sidebar.tsx src/lib/queries.ts src/app/mission-control/page.tsx
git commit -m "feat: add category filter to Mission Control sidebar"
```

---

### Task 8: Settings — Stages & Categories management UI

**Files:**
- Create: `src/components/settings/stages-settings.tsx`
- Create: `src/components/settings/categories-settings.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Create stages-settings.tsx**

Create `src/components/settings/stages-settings.tsx`:

A client component that receives `initialStages` as props. Renders an ordered list where each row shows: drag handle (future), icon, editable name input, color swatch, delete button (disabled if `!deletable`). Has "+ Add Stage" button at bottom. All mutations call the `/api/workflow-stages` endpoints and refresh.

- [ ] **Step 2: Create categories-settings.tsx**

Create `src/components/settings/categories-settings.tsx`:

A client component that receives `initialCategories` as props. Renders an ordered list where each row shows: icon, editable name input, color swatch, keyword count badge (clickable to expand and edit the `auto_rules` keywords as a comma-separated textarea), delete button. Has "+ Add Category" at bottom. "Re-run Auto-Sort" button at top calls `POST /api/repo-category/auto-sort` with a confirmation dialog.

- [ ] **Step 3: Wire into settings page**

In `src/app/settings/page.tsx`, import the new components and pass data:

```typescript
import { StagesSettings } from '@/components/settings/stages-settings';
import { CategoriesSettings } from '@/components/settings/categories-settings';
import { getAllWorkflowStages, getAllCategories } from '@/lib/queries';

// In the component:
const stages = getAllWorkflowStages();
const allCategories = getAllCategories();

// In the JSX, after DataSettings:
<hr className="border-gray-800" />
<StagesSettings initialStages={stages} />
<hr className="border-gray-800" />
<CategoriesSettings initialCategories={allCategories} />
```

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/stages-settings.tsx src/components/settings/categories-settings.tsx src/app/settings/page.tsx
git commit -m "feat: add stages and categories management to settings page"
```

---

### Task 9: Cleanup — Remove dead code, sync to desktop, verify

**Files:**
- Remove dead code from `src/lib/categories.ts` (already replaced in Task 3)
- Verify `src/app/page.tsx` no longer imports old `categorizeRepo` for in-memory use
- Remove old hardcoded `STAGES` references from any remaining files

- [ ] **Step 1: Grep for remaining hardcoded stage references**

```bash
grep -rn "watching.*want_to_try\|STAGES\s*=" src/components/ src/app/ src/lib/
```

Fix any files still using the old hardcoded array.

- [ ] **Step 2: Sync to desktop and verify compilation**

```bash
rsync -av --exclude 'node_modules' --exclude '.next' --exclude '*.db*' --exclude '.git' src/ ~/Desktop/StarDeck2/src/
```

Wait for compilation. Check dev server logs for errors.

- [ ] **Step 3: Test the full flow**

1. Load Mission Control — verify stages come from DB, category column appears
2. Click a stage dropdown — verify all stages render, "+ Add Stage" works
3. Click a category dropdown — verify categories render, selecting one persists
4. Go to Settings — verify stages and categories management sections exist
5. Add a custom stage, verify it appears in dropdowns
6. Add a custom category, verify it appears in sidebar and dropdown
7. Re-run auto-sort, verify repos get categorized
8. On dashboard, drag a repo to a different section, verify it sticks
9. Edit a section header name, verify it persists

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "chore: cleanup dead hardcoded stage/category code, verify build"
git push origin main
```
