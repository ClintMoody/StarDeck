import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRepoByFullName, getRepoLocalState, upsertRepoLocalState } from '@/lib/queries';
import { getLocalVersionInfo } from '@/lib/version-check-local';
import { execSync } from 'child_process';
import fs from 'fs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { owner, name, force } = await req.json();
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
    // Check for unmerged files (prior conflict)
    const unmerged = execSync('git diff --name-only --diff-filter=U', { cwd, encoding: 'utf-8', timeout: 5000 }).trim();
    if (unmerged) {
      if (force) {
        // User chose to discard local changes and reset to remote
        const branch = execSync('git branch --show-current', { cwd, encoding: 'utf-8', timeout: 5000 }).trim() || 'main';
        execSync('git reset --hard', { cwd, encoding: 'utf-8', timeout: 10000 });
        execSync(`git pull origin ${branch}`, { cwd, encoding: 'utf-8', timeout: 60000 });
      } else {
        return NextResponse.json({
          error: 'Merge conflict',
          detail: `Unresolved conflicts in: ${unmerged.split('\n').join(', ')}. Choose an option below.`,
          conflictFiles: unmerged.split('\n'),
          actions: ['force_pull', 'skip'],
        }, { status: 409 });
      }
    } else {
      const status = execSync('git status --porcelain', { cwd, encoding: 'utf-8', timeout: 10000 }).trim();
      const hasChanges = status.length > 0;

      if (hasChanges) {
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
    }

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
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Pull failed: ${e.message}` }, { status: 500 });
  }
}
