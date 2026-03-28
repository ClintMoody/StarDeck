import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { starredRepos, repoLocalState } from '@/lib/db/schema';
import { eq, isNotNull } from 'drizzle-orm';
import { GitHubClient } from '@/lib/github';
import { getLocalVersionInfo } from '@/lib/version-check-local';
import fs from 'fs';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = session.accessToken as string;
  if (!token) return NextResponse.json({ error: 'No GitHub token' }, { status: 401 });

  const client = new GitHubClient(token);

  // Get all repos that have a local clone
  const clonedRepos = db
    .select({
      repoId: repoLocalState.repoId,
      clonePath: repoLocalState.clonePath,
      localVersion: repoLocalState.localVersion,
    })
    .from(repoLocalState)
    .where(isNotNull(repoLocalState.clonePath))
    .all();

  if (clonedRepos.length === 0) {
    return NextResponse.json({ checked: 0, updated: 0 });
  }

  // Refresh local SHAs for all cloned repos (backfills any missing values)
  for (const clone of clonedRepos) {
    if (clone.clonePath && fs.existsSync(clone.clonePath)) {
      try {
        const info = getLocalVersionInfo(clone.clonePath);
        if (info.sha && info.sha !== clone.localVersion) {
          db.update(repoLocalState)
            .set({ localVersion: info.sha, localTag: info.tag })
            .where(eq(repoLocalState.repoId, clone.repoId))
            .run();
        }
      } catch {
        // skip if git read fails
      }
    }
  }

  const clonedRepoIds = new Set(clonedRepos.map(r => r.repoId));

  // Get the repo details for cloned repos
  const repos = db
    .select({
      id: starredRepos.id,
      owner: starredRepos.owner,
      name: starredRepos.name,
      latestRemoteSha: starredRepos.latestRemoteSha,
    })
    .from(starredRepos)
    .all()
    .filter(r => clonedRepoIds.has(r.id));

  let updated = 0;

  for (const repo of repos) {
    try {
      const sha = await client.getLatestCommitSha(repo.owner, repo.name);
      if (sha && sha !== repo.latestRemoteSha) {
        db.update(starredRepos)
          .set({ latestRemoteSha: sha })
          .where(eq(starredRepos.id, repo.id))
          .run();
        updated++;
      }
    } catch {
      // Skip failures — don't break the whole check for one repo
    }
  }

  return NextResponse.json({
    checked: repos.length,
    updated,
    rateLimit: client.rateLimit,
  });
}
