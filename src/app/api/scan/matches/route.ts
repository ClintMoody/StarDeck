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
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
