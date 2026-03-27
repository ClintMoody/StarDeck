import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllSavedViews, createSavedView, updateSavedView, deleteSavedView } from '@/lib/queries';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(getAllSavedViews());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, filters } = await req.json();
  if (!name || !filters) return NextResponse.json({ error: 'name and filters required' }, { status: 400 });

  createSavedView(name, JSON.stringify(filters));
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, filters } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  updateSavedView(id, {
    name: name || undefined,
    filters: filters ? JSON.stringify(filters) : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  deleteSavedView(id);
  return NextResponse.json({ ok: true });
}
