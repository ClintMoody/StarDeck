import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dirParam = req.nextUrl.searchParams.get('dir');
  const dir = dirParam
    ? dirParam.replace(/^~/, os.homedir())
    : os.homedir();

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const folders = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(dir, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      current: dir,
      parent: path.dirname(dir),
      folders,
    });
  } catch {
    return NextResponse.json({ error: 'Cannot read directory' }, { status: 400 });
  }
}
