import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { addReposToCollection, removeRepoFromCollection, getCollectionRepoIds } from '@/lib/queries';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const repoIds = getCollectionRepoIds(Number(id));
  return NextResponse.json({ repoIds });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { repoIds } = await req.json();
  if (!Array.isArray(repoIds)) return NextResponse.json({ error: 'repoIds must be an array' }, { status: 400 });

  addReposToCollection(Number(id), repoIds);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { repoId } = await req.json();
  if (!repoId) return NextResponse.json({ error: 'repoId is required' }, { status: 400 });

  removeRepoFromCollection(Number(id), repoId);
  return NextResponse.json({ ok: true });
}
