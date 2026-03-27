import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllScanDirectories, addScanDirectory, removeScanDirectory } from '@/lib/queries';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(getAllScanDirectories());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { path, recursive } = await req.json();
  if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 });

  try {
    addScanDirectory(path, recursive ?? true);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Directory already added' }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  removeScanDirectory(id);
  return NextResponse.json({ ok: true });
}
