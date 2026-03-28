# Custom Categories & Workflow Stages

## Problem

Workflow stages (Watching, Want to Try, Downloaded, Active, Archived) are hardcoded. Users can't add stages for their own workflow. Categories on the main dashboard (AI & Agents, Security & OSINT, etc.) are auto-assigned by keyword matching in `categories.ts` with no way to override, rename, reorder, or create new ones. When auto-sort gets a repo wrong, there's no fix short of editing source code.

## Design

Two distinct, DB-driven systems replace the hardcoded ones:

- **Workflow stages** — where you are with a repo (pipeline position)
- **Categories** — what the repo is (its type/domain)

Both are user-editable. Both ship with sensible defaults. Auto-categorization persists as an opt-in suggestion engine, not a locked assignment.

---

## Data Model

### Table: `workflow_stages`

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | auto-increment |
| name | text | e.g. "Watching" |
| icon | text | emoji |
| color | text | hex color |
| position | integer | display order |
| deletable | boolean | false for seeded defaults |

Seeded with 5 defaults: Watching (position 0), Want to Try (1), Downloaded (2), Active (3), Archived (4). All are renamable. Only user-created stages are deletable.

**Migration:** `starred_repos.workflow_stage` (text) becomes `starred_repos.workflow_stage_id` (integer FK). Migration maps existing text values ("watching" -> id 1, etc.) then drops the old column.

### Table: `categories`

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | auto-increment |
| name | text | e.g. "AI & Agents" |
| icon | text | emoji |
| color | text | hex color |
| position | integer | display order |
| auto_rules | text (JSON) | `{ keywords: string[] }` — keyword matchers for auto-sort |

Seeded from the 9 current `CATEGORY_DEFINITIONS` in `categories.ts` plus an "Other" catch-all (position last, no auto_rules). Each seeded category carries its existing keywords as `auto_rules`.

### Table: `repo_categories`

| Column | Type | Notes |
|--------|------|-------|
| repo_id | integer FK | references starred_repos.id |
| category_id | integer FK | references categories.id |
| is_auto | boolean | true = assigned by auto-sort, false = manual override |

Unique constraint on `(repo_id)` — one primary category per repo. Manual overrides (`is_auto = false`) are never touched by auto-sort. Auto-assigned repos (`is_auto = true`) are re-evaluated when auto-sort runs.

---

## Auto-Sort Engine

The existing `categorizeRepo()` function changes from reading hardcoded `CATEGORY_DEFINITIONS` to reading the `categories` table's `auto_rules` column. It runs:

1. **On sync** — after fetching starred repos, evaluate any repo that either has no category or has `is_auto = true`
2. **On demand** — "Re-run auto-sort" button in settings re-evaluates all `is_auto = true` repos
3. **On category rule edit** — when a user edits a category's auto_rules, offer to re-run

The matching logic (topic exact match, word-boundary match on description/name) stays the same. The only change is the source of category definitions moves from code to DB.

---

## API Endpoints

### Stages
- `GET /api/workflow-stages` — list all stages ordered by position
- `POST /api/workflow-stages` — create a new stage `{ name, icon, color }`
- `PATCH /api/workflow-stages/[id]` — update name, icon, color, position
- `DELETE /api/workflow-stages/[id]` — delete (fails if repos assigned, unless `reassignTo` param provided)

### Categories
- `GET /api/categories` — list all categories ordered by position
- `POST /api/categories` — create a new category `{ name, icon, color, auto_rules? }`
- `PATCH /api/categories/[id]` — update name, icon, color, position, auto_rules
- `DELETE /api/categories/[id]` — delete (reassigns repos to "Other")

### Repo Category Assignment
- `POST /api/repo-category` — `{ repoId, categoryId }` — sets manual override (`is_auto = false`)
- `POST /api/repo-category/auto-sort` — re-runs auto-sort on all `is_auto = true` repos

### Stage Assignment
- Existing `POST /api/workflow-stage` changes to accept stage ID instead of text key

---

## UI Changes

### Mission Control — Stage Dropdown
- Reads stages from DB via the page's server component (fetched alongside repos)
- "+ Add Stage" at the bottom of the dropdown — inline input for name, auto-assigns next color from a palette
- Stages render with their DB-stored icon and color

### Mission Control — Category Column
- New column added after the Stage column
- Shows the repo's category as a colored pill (icon + name)
- Click opens a dropdown listing all categories. Selecting one calls `POST /api/repo-category`
- If the repo was auto-assigned, the pill has a subtle "auto" indicator (small dot or lighter opacity). Once manually set, indicator disappears.

### Dashboard — Sectioned View
- Sections read from the `categories` table + `repo_categories` join instead of running `categorizeRepo()` in memory
- **Drag and drop:** dragging a repo card to a different section calls `POST /api/repo-category` with the target category. Uses HTML5 drag events (no library needed for this — the cards are simple).
- **Section header edit:** hover shows a pencil icon. Click opens an inline rename field. Changes call `PATCH /api/categories/[id]`.
- Repos with no category fall into the "Other" section at the bottom.

### Sidebar (Mission Control)
- Categories section added between Collections and Watch Level
- Click to filter by category (same pattern as collections — sets `categoryId` search param)
- Shows count per category

### Settings — Stages & Categories
- **Stages tab:** ordered list of stages. Each row: drag handle, icon, name (editable inline), color picker, delete button (grayed out for non-deletable defaults). "+ Add Stage" button at bottom.
- **Categories tab:** ordered list of categories. Each row: drag handle, icon, name (editable inline), color picker, keyword count badge, expand to edit auto_rules, delete button. "+ Add Category" at bottom. "Re-run Auto-Sort" button at top (with confirmation: "This will re-evaluate X auto-assigned repos. Manual overrides won't change.").

---

## Migration Strategy

This is a breaking schema change. Migration steps:

1. Create `workflow_stages` table, seed 5 defaults
2. Create `categories` table, seed from current `CATEGORY_DEFINITIONS` (9 categories + Other)
3. Create `repo_categories` table
4. Add `workflow_stage_id` column to `starred_repos`, populate by mapping existing `workflow_stage` text values to the seeded stage IDs
5. Run auto-sort on all repos to populate `repo_categories` with `is_auto = true`
6. Drop `starred_repos.workflow_stage` column (SQLite requires table rebuild for column drops — use Drizzle's migration tooling)

Step 6 is risky in SQLite. Alternative: keep the old column but stop reading from it. All queries switch to the FK. The old column becomes dead weight but avoids a table rebuild.

**Recommended:** Keep the old column, ignore it. Simpler, no data risk.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Add 3 new tables, add `workflowStageId` FK to `starredRepos` |
| `drizzle/0004_*.sql` | Migration for new tables and data seeding |
| `src/lib/categories.ts` | Rewrite to read from DB instead of hardcoded array |
| `src/lib/queries.ts` | Add queries for stages, categories, repo_categories |
| `src/app/api/workflow-stages/route.ts` | New — CRUD for stages |
| `src/app/api/categories/route.ts` | New — CRUD for categories |
| `src/app/api/repo-category/route.ts` | New — assign category to repo |
| `src/components/mission-control/stage-dropdown.tsx` | Read from DB, add "+ Add Stage" |
| `src/components/mission-control/category-dropdown.tsx` | New — category picker for repo rows |
| `src/components/mission-control/repo-table.tsx` | Add category column |
| `src/components/mission-control/repo-table-row.tsx` | Render category pill + dropdown |
| `src/components/mission-control/mc-sidebar.tsx` | Add categories filter section |
| `src/components/dashboard/sectioned-view.tsx` | Read from DB, add drag-drop + section edit |
| `src/app/page.tsx` | Query categories from DB instead of computing in memory |
| `src/app/mission-control/page.tsx` | Fetch stages and categories from DB |
| `src/app/settings/page.tsx` | Add stages/categories management sections |
| `src/components/settings/stages-settings.tsx` | New — stage management UI |
| `src/components/settings/categories-settings.tsx` | New — category management UI |

---

## What This Does NOT Include

- Multi-category assignment (a repo gets one primary category — keeps the UI simple)
- Nested/hierarchical categories
- Category-based notifications or watch rules
- AI-powered categorization (sticking with keyword matching)
