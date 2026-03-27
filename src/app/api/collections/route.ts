import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllCollections, createCollection, updateCollection, deleteCollection, getCollectionCounts } from '@/lib/queries';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const collections = getAllCollections();
  const counts = getCollectionCounts();

  return NextResponse.json(
    collections.map(c => ({
      ...c,
      count: counts.find(cc => cc.collectionId === c.id)?.count || 0,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, color, autoRules } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  createCollection(name, color || '#8b949e', autoRules ? JSON.stringify(autoRules) : undefined);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, color, autoRules } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  updateCollection(id, {
    name: name || undefined,
    color: color || undefined,
    autoRules: autoRules ? JSON.stringify(autoRules) : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  deleteCollection(id);
  return NextResponse.json({ ok: true });
}
