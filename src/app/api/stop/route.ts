import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processManager } from "@/lib/process-manager";
import { getRepoByFullName } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, name } = await request.json();
  if (!owner || !name) return NextResponse.json({ error: "Missing owner or name" }, { status: 400 });

  const repo = getRepoByFullName(owner, name);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

  const stopped = processManager.stop(repo.id);
  return NextResponse.json({ ok: stopped });
}
