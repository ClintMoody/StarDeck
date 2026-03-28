import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { setRepoCategory } from '@/lib/queries';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { repoId, categoryId } = await req.json();
  if (!repoId || !categoryId) return NextResponse.json({ error: 'repoId and categoryId required' }, { status: 400 });
  setRepoCategory(repoId, categoryId, false);
  return NextResponse.json({ ok: true });
}
