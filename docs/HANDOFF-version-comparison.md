# Handoff: Fix Version Comparison ("Up to Date" Logic)

> **Priority:** High — this is the core value prop of Mission Control
> **Date:** 2026-03-28

## The Problem

The "Local" and "Version" columns in Mission Control are currently cosmetic. They don't actually compare what's on GitHub against what's downloaded locally. Every repo shows "Not cloned" or "—" because:

1. **Sync doesn't fetch the latest commit SHA** from GitHub. It stores `lastCommitAt` (a timestamp from `pushed_at`) but not the actual HEAD commit SHA of the remote default branch.
2. **Local version info is never populated.** `repoLocalState.localVersion` (HEAD SHA) and `localTag` are only set when updating via `/api/update-repo` — not during directory scan, not on clone, not on page load.
3. **The comparison has nothing real to compare.** `compareVersions()` in `version-check.ts` works correctly when given data, but it's never given real data.

## What Needs to Change

### 1. Sync: Fetch latest commit SHA from GitHub API

**File:** `src/lib/sync.ts`

During `syncStarredRepos()`, for each repo, also fetch the latest commit SHA on the default branch. The GitHub API provides this via:
- `GET /repos/{owner}/{repo}/commits/{branch}` → returns `sha`
- Or use the `pushed_at` field comparison + `GET /repos/{owner}/{repo}/git/ref/heads/{default_branch}` → `object.sha`

Store this in a new column `latestRemoteSha` on `starredRepos` (needs schema change + migration).

**Rate limit concern:** With 57 repos, fetching commit SHAs for each during sync adds 57 API calls. Consider:
- Only fetch for repos with `clonePath` set (downloaded repos only)
- Or batch using GraphQL API
- Or accept the cost since it's within rate limits for most users

### 2. Scanner: Read local HEAD SHA when matching

**File:** `src/lib/scanner.ts`

`getGitInfo()` already returns `headSha`. But when the scan auto-matches repos in `/api/scan/route.ts`, it doesn't store `headSha` into `repoLocalState.localVersion`.

Fix: After auto-matching, also run:
```typescript
upsertRepoLocalState(match.repoId, {
  clonePath: match.localPath,
  localVersion: scanResult.headSha,  // ADD THIS
});
```

### 3. Clone: Store HEAD SHA after cloning

**File:** `src/app/api/clone/route.ts`

After clone completes, read the local HEAD SHA and store it:
```typescript
import { getLocalVersionInfo } from '@/lib/version-check';
const versionInfo = getLocalVersionInfo(clonePath);
upsertRepoLocalState(repo.id, {
  localVersion: versionInfo.sha,
  localTag: versionInfo.tag,
});
```

### 4. Mission Control page: Compute version status per row

**File:** `src/app/mission-control/page.tsx` or `src/components/mission-control/repo-table-row.tsx`

The `RepoTableRow` currently has this logic:
```typescript
const isOutdated = isCloned && localState?.localVersion && repo.lastReleaseVersion &&
  localState.localTag !== repo.lastReleaseVersion;
```

This only works for release-based comparison. Replace with:
```typescript
const versionResult = compareVersions({
  localTag: localState?.localTag || null,
  localSha: localState?.localVersion || null,
  latestRelease: repo.lastReleaseVersion || null,
  latestRemoteSha: repo.latestRemoteSha || null,  // NEW FIELD
});
const isOutdated = versionResult.status === 'outdated';
```

And use `formatVersionDisplay(versionResult)` for the Version column.

### 5. Schema change

**File:** `src/lib/db/schema.ts`

Add to `starredRepos`:
```typescript
latestRemoteSha: text('latest_remote_sha'),
```

**Migration:** `ALTER TABLE starred_repos ADD COLUMN latest_remote_sha TEXT;`

## Files to Touch

| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Add `latestRemoteSha` column |
| `src/lib/db/migrate-mission-control.ts` | Add ALTER TABLE for new column |
| `src/lib/sync.ts` | Fetch + store latest commit SHA during sync |
| `src/app/api/scan/route.ts` | Store `headSha` from scan results |
| `src/app/api/clone/route.ts` | Read + store HEAD SHA after clone |
| `src/components/mission-control/repo-table-row.tsx` | Use `compareVersions()` properly |
| `src/lib/version-check.ts` | No changes needed — logic already works |
| `tests/lib/version-check.test.ts` | Already covers this — no changes |

## Testing

After implementing:
1. Run a sync — verify `latestRemoteSha` gets populated in the DB
2. Add a scan directory with a cloned repo — verify `localVersion` gets set
3. Look at Mission Control — outdated repos should show "abc1234 → def5678" or "v1.0 → v1.1"
4. Clone a repo via the UI — verify version info appears immediately
5. Manually `git checkout HEAD~5` in a cloned repo, then refresh MC — should show "Outdated"

## Existing Test Coverage

- `tests/lib/version-check.test.ts` — 19 tests covering all comparison scenarios (already passing)
- `tests/lib/scanner.test.ts` — 14 tests including `getGitInfo` which reads HEAD SHA

The logic layer is solid. The gap is in the data pipeline — getting real values into the fields the logic already checks.
