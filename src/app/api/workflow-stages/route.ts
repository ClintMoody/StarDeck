import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllWorkflowStages, createWorkflowStage, updateWorkflowStageDef, deleteWorkflowStage } from '@/lib/queries';
import { db } from '@/lib/db';
import { workflowStages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getAllWorkflowStages());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, icon, color } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const stage = createWorkflowStage({ name, icon: icon || '📌', color: color || '#8b949e' });
  return NextResponse.json(stage);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  updateWorkflowStageDef(id, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, reassignToId } = await req.json();
  if (!id || !reassignToId) return NextResponse.json({ error: 'id and reassignToId required' }, { status: 400 });
  const stage = db.select().from(workflowStages).where(eq(workflowStages.id, id)).get();
  if (stage && !stage.deletable) return NextResponse.json({ error: 'Cannot delete default stage' }, { status: 400 });
  deleteWorkflowStage(id, reassignToId);
  return NextResponse.json({ ok: true });
}
