# Approach C: Unified Dashboard Rewrite (Future)

> **Status:** Parked — saved for a future major version. Currently implementing Approach B (Mission Control Hub as a separate page).

## Vision

Replace the home page entirely with a single unified dashboard where the mission control table is the default view. Workflow pipeline stages become THE primary organizing principle. Card/grid views become toggle options within the same page, and the current "Active / Recent / Categories" sectioned view becomes one of several view presets.

## What This Would Involve

### 1. Home Page Replacement
- Current `src/app/page.tsx` rewritten from scratch
- `SectionedView` becomes a "preset" view rather than the default
- Default view is the mission control table (list view)
- View toggle: Table | Cards | Sectioned (preset)

### 2. Workflow Pipeline as Primary Organizer
- Every repo has a workflow stage: Watching → Want to Try → Downloaded → Active Project → Archived
- Top-level tabs or pipeline bar showing stage counts
- Drag-and-drop between stages (or quick-assign dropdown)
- Stage is the primary grouping — replaces current auto-categories as the top-level organizer

### 3. Unified Sidebar
- Collections (custom user-created groups)
- Watch levels (Releases Only / Active Tracking / Full Watch)
- Filters: language, tags, local status, update status
- Directory scanner config integrated (not buried in settings)
- Saved filter presets

### 4. Table View (Mission Control)
- Columns: repo name, workflow stage, local status, version comparison, last activity, stars, disk usage, quick actions, collections, watch level, notes preview, update urgency
- Sortable, filterable, column-toggleable
- Inline actions: update, clone, run, open folder, move stage
- Bulk selection with multi-action toolbar
- Right-click context menu

### 5. Card/Grid View
- Preserved from current implementation but enhanced with:
  - Workflow stage badge on each card
  - Local status indicator (downloaded/outdated/up to date)
  - Quick-action overlay on hover

### 6. Sectioned Preset View
- Current "Active / Cloned / Recent / Categories" view preserved as a preset
- Enhanced with workflow stage awareness
- One-click switch from any view

### 7. Directory Scanner (Full Integration)
- Scanner config panel in sidebar (not settings)
- Add/remove watch directories inline
- Real-time filesystem watcher with status indicator
- Auto-match by git remote URL
- Guided matching for ambiguous repos
- Scan status visible in the dashboard

### 8. Activity & Watch System
- Per-repo watch levels control notification granularity
- Activity feed integrated into the dashboard (collapsible panel)
- Timeline view for full-watch repos

### 9. Update System
- Default: smart pull (stash, pull, reapply)
- Expandable: branch info, release tags, reset options
- Bulk update capability
- Pre-clone dry run preview

## Migration Strategy
- Preserve all existing data models (extend, don't replace)
- Add `workflowStage` column to `starredRepos` or `repoLocalState`
- Add `collections` and `collectionRepos` tables
- Add `watchLevel` column
- Add `scanDirectories` table
- Existing auto-categories become seed data for collections

## Estimated Scope
- Large rewrite — touches home page, sidebar, card components, data layer
- Should be done as a phased rollout or feature-flagged
- Recommend building Approach B first to validate UX patterns, then evolve into C

## Why We're Waiting
- Approach B gives us 80% of the value with less risk
- B validates the table view UX, workflow stages, and scanner before committing to a full rewrite
- Learnings from B will improve the C design
