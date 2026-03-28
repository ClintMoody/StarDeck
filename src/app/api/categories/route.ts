import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllDbCategories, createDbCategory, updateDbCategory, deleteDbCategory } from '@/lib/queries';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getAllDbCategories());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, icon, color, autoRules } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const cat = createDbCategory({ name, icon: icon || '📁', color: color || '#8b949e', autoRules: autoRules || null });
  return NextResponse.json(cat);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  updateDbCategory(id, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  deleteDbCategory(id);
  return NextResponse.json({ ok: true });
}
