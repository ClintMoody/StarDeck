# Mission Control — Design Spec

> **Approach:** B — Dedicated Mission Control page alongside existing home/browse view.
> **Date:** 2026-03-27
> **Status:** Approved for implementation

## Overview

A new "Mission Control" page in StarDeck that serves as a command center for managing all starred, downloaded, and installed GitHub repos. Provides a dense, sortable table view with workflow pipeline stages, directory scanning for local repo discovery, version comparison (local vs remote), per-repo watch levels, custom collections, and contextual actions.

The existing home page (sectioned browse view) remains as-is for discovery. Mission Control is for management.

---

## 1. Page Layout

### Navigation
- Top nav gains a new "Mission Control" tab alongside Home and Settings.
- Active tab is visually distinct (highlighted).
- Toolbar shows "Last scan: Xm ago" with a manual re-scan button.

### Workflow Pipeline Bar
- Horizontal bar below the top nav.
- Tabs: **All** | **Watching** | **Want to Try** | **Downloaded** | **Active Project** | **Archived**
- Each tab shows a count badge.
- Clicking a tab filters the table to that stage. "All" shows everything.
- Every repo has exactly one workflow stage at a time.

### Left Sidebar
Three sections:
1. **Collections** — User-created groups (with repo counts). "New Collection" link at bottom. Clicking a collection filters the table. Repos can belong to multiple collections.
2. **Watch Level** — Filter by: Releases Only, Active Tracking, Full Watch.
3. **Quick Filters** — Updates Available, Security Alerts, By Tag.

### Main Table Area
- Toolbar: search input, repo count, column toggle dropdown, export button.
- Dense sortable table (see Section 2).
- Bulk action bar appears when checkboxes are selected.

---

## 2. Table Columns

| Column | Description | Default On |
|--------|-------------|------------|
| Checkbox | Bulk selection | Yes |
| Repository | Owner/name (clickable), watch level icon, note preview snippet below | Yes |
| Stage | Workflow stage pill (color-coded). Clickable for inline stage change dropdown. | Yes |
| Local Status | "Not cloned" / "Up to date" / "Outdated" / "Vulnerable" with icons | Yes |
| Version | Local version vs remote. Shows release versions when available (e.g., "v0.1.5 → v0.2.1"), falls back to commit SHA comparison (e.g., "b4267 = b4267" or "b4267 → a9f31 +23 commits") | Yes |
| Last Activity | Time since last commit or release on GitHub | Yes |
| Stars | Star count | Yes |
| Disk Usage | Size of local clone (blank if not cloned) | Yes |
| Actions | Contextual buttons that change based on repo state (see Section 3) | Yes |
| Collections | Tags/collection badges the repo belongs to | Yes |
| Watch Level | Current watch tier icon | No (shown inline under repo name instead) |
| Notes Preview | First ~50 chars of user note | No (shown inline under repo name instead) |
| Update Urgency | Security advisory flag, breaking changes indicator | No (shown via row highlighting + Local Status column) |
| Stale Indicator | "No commits in 6+ months" or "Archived upstream" warning | No (togglable) |

### Column Behavior
- All columns sortable by clicking the header.
- Column visibility, widths, and sort order persist between sessions (stored in `settings` table).
- Default sort: Update urgency (security first), then outdated repos, then by last activity.

---

## 3. Contextual Row Actions

Actions change based on repo state:

| State | Primary Action | Secondary Actions |
|-------|---------------|-------------------|
| Not cloned (Watching) | **Clone** (green) | Preview (dry run) |
| Not cloned (Want to Try) | **Clone** (green) | Preview (dry run) |
| Downloaded, up to date | **Run** | Open folder |
| Downloaded, outdated | **Update** (blue) | Run, Open folder |
| Downloaded, vulnerable | **Update!** (red) | Run, Open folder |
| Active (running) | **Stop** | Open folder |

### Overflow Menu (▾)
Available on every row:
- Move to stage → (submenu with all stages)
- Change watch level → (submenu)
- Add to collection → (submenu with checkboxes)
- Manage tags
- View on GitHub
- View details (opens existing detail page)
- Copy clone URL
- Delete local clone
- Remove from StarDeck

### Quick Stage Change
Clicking the stage pill in the table opens an inline dropdown to change the stage immediately. This is the primary way to "move repos between groups quickly."

---

## 4. Workflow Stages

### Default Stages
1. **Watching** — Starred but not downloaded. Just keeping an eye on it.
2. **Want to Try** — Interested in trying this out. Queued for download.
3. **Downloaded** — Cloned locally but not actively using.
4. **Active Project** — Currently using or working with this repo.
5. **Archived** — Done with this, keeping for reference.

### Auto-Advancement Rules
- Clone a "Watching" or "Want to Try" repo → auto-advances to "Downloaded"
- Run a "Downloaded" repo for the first time → auto-advances to "Active Project"
- User can always override or disable auto-advancement in Settings.
- Auto-advancement never moves repos backward or to "Archived."

### Stage Storage
- New column `workflowStage` on `starredRepos` table (text, default: "watching").
- Existing repos get "watching" as default. Repos with existing `clonePath` get "downloaded." Repos with `processStatus = "running"` get "active."

---

## 5. Collections

### Data Model
- New `collections` table: `id`, `name`, `color`, `autoRules` (JSON, nullable), `createdAt`.
- New `collectionRepos` junction table: `collectionId`, `repoId`.
- A repo can belong to multiple collections.

### Auto-Rules
- Optional per-collection rules that auto-assign repos based on: topics, language, description keywords.
- Seeded from existing auto-categorization in `categories.ts`.
- Example: collection "AI Tools" with rule `topics CONTAINS "machine-learning" OR "ai" OR "llm"`.
- Auto-rules run on sync (when new repos are starred) and can be triggered manually.

### UI
- Sidebar shows all collections with counts.
- Create/rename/delete collections via sidebar.
- Assign repos to collections via overflow menu or bulk action.

---

## 6. Watch Levels

### Tiers
1. **Releases Only** — Only notify on new GitHub releases. Lowest noise.
2. **Active Tracking** — Releases + significant commit activity summaries (e.g., "47 commits this week") + issue/PR activity relevant to the repo.
3. **Full Watch** — Everything: commits, issues, PRs, releases, forks, stars milestones. RSS-feed-style timeline.

### Storage
- New column `watchLevel` on `starredRepos` table (text, default: "releases_only").

### Notification Routing
- Watch level determines which GitHub events trigger notifications.
- Integrates with existing notification system (`notifications` table and `NotificationBell` component).
- Releases Only → notification on new release only.
- Active Tracking → releases + weekly activity digest + issues/PRs with significant activity.
- Full Watch → all events, real-time where possible.

### Data Fetching
- Releases: already fetched during sync (stored in `releases` table).
- Commit activity: extend sync to fetch `repo.pushed_at` and compare to last known.
- Issues/PRs: new API calls during sync for repos on Active Tracking or Full Watch. Stored in new `repoActivity` table.

---

## 7. Directory Scanner

### Configuration
- **Settings page** has a "Scan Directories" panel.
- Add/remove directories to watch. Each directory has a toggle for recursive vs. shallow scan.
- Default: include the existing `clone_directory` setting.

### First Scan Flow
1. Walk each configured directory, find all `.git` folders.
2. Read `git remote -v` from each to extract the remote URL.
3. Parse `owner/name` from remote URL (supports github.com HTTPS and SSH formats).
4. Match against starred repos in database.
5. Results in three buckets:
   - **Auto-matched** — clear owner/name match. Linked automatically. `clonePath` set in `repoLocalState`.
   - **Ambiguous** — local repo found but no exact match (possible fork, rename, or non-GitHub remote). Surfaced in a confirmation UI.
   - **Untracked** — local git repos not in starred list. Option to add to StarDeck or dismiss.
6. User reviews ambiguous and untracked matches before they're saved.

### Continuous Watching
- After first scan, filesystem watcher (`chokidar` or `fs.watch`) monitors configured directories.
- Detects: new `.git` directories (new clones), deleted directories (removed clones).
- Auto-matches new finds. Flags deletions for review.
- Watcher runs as part of the Next.js server process.

### Multi-Location Conflicts
- If the same repo is found in multiple locations, surface all paths and let the user pick the "primary" copy.
- Primary copy is what version comparison and update actions operate on.
- Non-primary copies shown as "(also found at: ~/Downloads/langchain)".

### Status Indicator
- Mission Control toolbar: "Last scan: 2m ago" with refresh button.
- Settings page: full scan history and per-directory status.

---

## 8. Version Comparison

### Remote Version Detection
- **Release-based**: If repo has releases, use `lastReleaseVersion` and `lastReleaseAt` from existing `releases` table.
- **Commit-based**: Use `lastCommitAt` (GitHub's `pushed_at`) from `starredRepos` table. Extended: fetch latest commit SHA on default branch during sync.

### Local Version Detection
- Read local HEAD commit SHA via `git rev-parse HEAD` in the clone directory.
- Read current checked-out tag (if any) via `git describe --tags --exact-match`.
- Store in `repoLocalState.localVersion` (commit SHA) and new `repoLocalState.localTag` (tag name if on a tag).

### Comparison Display
- **When releases available**: "v0.1.5 → v0.2.1" (local tag vs latest release).
- **When no releases**: "b4267 → a9f31 (+23 commits)" (short SHAs with commit count behind).
- **Up to date**: "v0.2.1 ✓" or "b4267 ✓" in green.
- Comparison runs during sync and on-demand when viewing Mission Control.

### Stale Detection
- Repos with no commits in 6+ months: "⏸ No activity since Oct 2025" indicator.
- Repos archived on GitHub: "📦 Archived upstream" warning.

---

## 9. Update System

### Default (One-Click Update Button)
Smart pull:
1. Check for local uncommitted changes.
2. If changes exist: `git stash`, `git pull`, `git stash pop`. Warn if stash pop conflicts.
3. If clean: `git pull`.
4. Update `localVersion` and `localTag` in database.
5. Re-run recipe detection if `package.json` / `requirements.txt` etc. changed.

### Advanced (Overflow Menu → "Update Options...")
Opens a modal/panel with:
- Current branch and local status.
- List of available release tags to checkout.
- Option to switch to a specific tag/release.
- Option to hard reset to match remote (with confirmation).
- Diff summary: X commits behind, Y files changed.

### Pre-Clone Preview (Dry Run)
Before cloning a new repo, show:
- Estimated disk space (from GitHub API `size` field).
- Detected project type and what install commands would run.
- Dependencies overview (if detectable).
- Which watch directory it would clone into (with option to change).

### Clone Destination Picker
- When clicking Clone, a dropdown shows all configured scan directories.
- Default is the primary `clone_directory` setting.
- User picks where to put it.

### Update Changelog Preview
- Before updating, expandable section showing:
  - Number of commits since local version.
  - Release notes for any releases in between.
  - Breaking change warnings (if releases use semver major bumps).

---

## 10. Bulk Operations

### Selection
- Checkbox column for multi-select.
- Shift+click for range select.
- "Select all" checkbox in header (selects current filtered view).

### Bulk Actions Bar
Appears when items selected:
- **Move to Stage** → dropdown with all stages.
- **Set Watch Level** → dropdown with tiers.
- **Add to Collection** → dropdown with collections.
- **Add Tag** → tag picker.
- **Update All** — pull latest for all selected downloaded repos.
- **Clone All** — clone all selected non-downloaded repos.
- **Delete Clones** — remove local copies (with confirmation).

---

## 11. Row Interaction

### Click Behavior
- Clicking repo name opens the existing slide-out panel (already built) with full detail view.
- Clicking stage pill opens inline stage-change dropdown.
- Clicking elsewhere in the row selects it (checkbox toggle).

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `j` / `k` | Move selection up/down |
| `s` | Change stage of selected repo |
| `u` | Update selected repo |
| `c` | Clone selected repo |
| `Enter` | Open detail panel |
| `/` | Focus search |
| `Escape` | Close panel/deselect |
| `Space` | Toggle checkbox |

---

## 12. "Why Did I Save This?" Feature

For repos with no user note and no local clone:
- Show the date starred: "Starred on Jan 15, 2026."
- After 30+ days with no note and no download, show a subtle prompt: "Still interested?" with quick actions: Add Note, Move to Want to Try, Archive, Remove.
- This appears as a gentle nudge in the detail panel, not as a notification.

---

## 13. Disk Usage Summary

- Toolbar stat: "14 clones — 4.2 GB total"
- Expandable breakdown by stage (e.g., Active: 2.1 GB, Downloaded: 1.8 GB, Archived: 0.3 GB).
- Per-repo disk usage in table column.
- Sortable by disk usage to find largest clones.

---

## 14. Saved Views / Presets

- Save current filter combination (stage + collection + watch level + sort + search) as a named preset.
- Presets appear in the sidebar under a "Saved Views" section.
- Built-in presets:
  - "Needs Attention" — outdated + security alerts.
  - "Ready to Try" — Want to Try stage, sorted by stars.
  - "Space Hogs" — downloaded, sorted by disk usage desc.
- Users can create, rename, and delete custom presets.
- Stored in `settings` table as JSON.

---

## 15. Export / Share Collections

- Export a collection as:
  - **Markdown** — formatted list with descriptions and links.
  - **JSON** — machine-readable for import into another StarDeck instance.
  - **URL list** — plain GitHub URLs.
- Accessible from collection context menu in sidebar.

---

## 16. Data Model Changes Summary

### New Tables
| Table | Purpose |
|-------|---------|
| `collections` | User-created groups (id, name, color, autoRules, createdAt) |
| `collectionRepos` | Junction: collectionId, repoId |
| `scanDirectories` | Configured scan paths (id, path, recursive, enabled, lastScannedAt) |
| `repoActivity` | Commit/issue/PR activity for watched repos (repoId, type, summary, data, createdAt) |
| `savedViews` | Named filter presets (id, name, filters JSON, createdAt) |

### Modified Tables
| Table | Change |
|-------|--------|
| `starredRepos` | Add `workflowStage` (text, default "watching"), `watchLevel` (text, default "releases_only") |
| `repoLocalState` | Add `localTag` (text, nullable). Actively populate `localVersion` with HEAD SHA. |

### Migration Strategy
- Existing repos default to `workflowStage = "watching"`.
- Repos with `clonePath` set → `workflowStage = "downloaded"`.
- Repos with `processStatus = "running"` → `workflowStage = "active"`.
- Existing auto-categories seed initial collections with auto-rules.

---

## 17. New API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mission-control` | GET | Fetch repos with all mission control fields, supports filtering/sorting |
| `/api/workflow-stage` | POST | Change stage for one or more repos |
| `/api/watch-level` | POST | Change watch level for one or more repos |
| `/api/collections` | GET, POST, PUT, DELETE | CRUD for collections |
| `/api/collections/[id]/repos` | POST, DELETE | Add/remove repos from a collection |
| `/api/scan` | POST | Trigger directory scan |
| `/api/scan/directories` | GET, POST, DELETE | Manage scan directories |
| `/api/scan/matches` | GET, POST | View and confirm ambiguous matches |
| `/api/update-repo` | POST | Smart pull / update a local repo |
| `/api/version-check` | GET | Compare local vs remote versions for a repo |
| `/api/saved-views` | GET, POST, PUT, DELETE | CRUD for saved view presets |

---

## 18. Component Structure

### New Components
- `MissionControlPage` — main page component (`/app/mission-control/page.tsx`)
- `PipelineBar` — workflow stage tabs with counts
- `MissionControlSidebar` — collections, watch levels, filters
- `RepoTable` — sortable, filterable table
- `RepoTableRow` — single row with contextual actions
- `StageDropdown` — inline stage change picker
- `BulkActionBar` — appears on multi-select
- `ScanSetup` — directory scanner configuration (Settings + Mission Control)
- `ScanMatchReview` — UI for confirming ambiguous matches
- `UpdateModal` — advanced update options (branch, tag, reset)
- `ClonePreview` — dry run / destination picker before cloning
- `SavedViewManager` — create/manage view presets
- `CollectionManager` — create/edit collections and auto-rules

### Reused Existing Components
- `SlideOutPanel` — repo detail on row click
- `NotificationBell` — enhanced with watch level routing
- `BulkToolbar` — extended with new actions (stage, watch level, collection)
- `SearchInput` — reused in table toolbar
- `KeyboardHandler` — extended with table navigation shortcuts
