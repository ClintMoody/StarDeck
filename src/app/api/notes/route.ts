import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRepoNote, upsertRepoNote } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repoId = request.nextUrl.searchParams.get("repoId");
  if (!repoId) return NextResponse.json({ error: "Missing repoId" }, { status: 400 });

  const note = getRepoNote(parseInt(repoId, 10));
  return NextResponse.json({ content: note?.content ?? "" });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { repoId, content } = body;

  if (!repoId || typeof content !== "string") {
    return NextResponse.json({ error: "Missing repoId or content" }, { status: 400 });
  }

  upsertRepoNote(repoId, content);
  return NextResponse.json({ ok: true });
}
