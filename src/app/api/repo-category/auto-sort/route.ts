import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { runAutoSort } from '@/lib/categories';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = runAutoSort();
  return NextResponse.json(result);
}
