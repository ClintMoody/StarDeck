import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRepoByFullName, getRepoLocalState } from '@/lib/queries';
import { getLocalVersionInfo } from '@/lib/version-check-local';
import { compareVersions, formatVersionDisplay } from '@/lib/version-check';

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
    latestRemoteSha: repo.latestRemoteSha || null,
  });

  return NextResponse.json({
    ...result,
    display: formatVersionDisplay(result),
  });
}
