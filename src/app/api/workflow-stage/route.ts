import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateWorkflowStage } from '@/lib/queries';
import { starredRepos } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { inArray } from 'drizzle-orm';

const VALID_STAGES = ['watching', 'want_to_try', 'downloaded', 'active', 'archived'];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { repoIds, stage, stageId } = await req.json();

  if (!Array.isArray(repoIds) || repoIds.length === 0) {
    return NextResponse.json({ error: 'repoIds must be a non-empty array' }, { status: 400 });
  }

  if (stageId) {
    db.update(starredRepos)
      .set({ workflowStageId: stageId })
      .where(inArray(starredRepos.id, repoIds))
      .run();
    return NextResponse.json({ ok: true });
  }

  if (!VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` }, { status: 400 });
  }

  updateWorkflowStage(repoIds, stage);
  return NextResponse.json({ ok: true, updated: repoIds.length });
}
