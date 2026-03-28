import { NextResponse } from 'next/server';
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

  const allScanResults = [];
  for (const dir of dirs) {
    const repoPaths = findGitRepos(dir.path, dir.recursive);
    for (const repoPath of repoPaths) {
      allScanResults.push(getGitInfo(repoPath));
    }
    updateScanDirectoryTimestamp(dir.id);
  }

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

  // Build a lookup from localPath -> headSha for storing version info
  const shaByPath = new Map<string, string | null>();
  for (const scan of allScanResults) {
    shaByPath.set(scan.localPath, scan.headSha);
  }

  for (const match of matches.autoMatched) {
    const headSha = shaByPath.get(match.localPath) ?? null;
    const existing = db.select().from(repoLocalState)
      .where(eq(repoLocalState.repoId, match.repoId))
      .get();

    if (existing) {
      db.update(repoLocalState)
        .set({ clonePath: match.localPath, localVersion: headSha })
        .where(eq(repoLocalState.repoId, match.repoId))
        .run();
    } else {
      db.insert(repoLocalState)
        .values({ repoId: match.repoId, clonePath: match.localPath, localVersion: headSha, processStatus: 'stopped' })
        .run();
    }

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
