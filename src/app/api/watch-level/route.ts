import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateWatchLevel } from '@/lib/queries';

const VALID_LEVELS = ['releases_only', 'active_tracking', 'full_watch'];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { repoIds, level } = await req.json();

  if (!Array.isArray(repoIds) || repoIds.length === 0) {
    return NextResponse.json({ error: 'repoIds must be a non-empty array' }, { status: 400 });
  }
  if (!VALID_LEVELS.includes(level)) {
    return NextResponse.json({ error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` }, { status: 400 });
  }

  updateWatchLevel(repoIds, level);
  return NextResponse.json({ ok: true, updated: repoIds.length });
}
