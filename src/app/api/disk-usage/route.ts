import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { repoLocalState, starredRepos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDirSize, formatBytes } from "@/lib/disk-usage";
import "@/lib/db/migrate";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const states = db.select().from(repoLocalState).all();
  let totalBytes = 0;
  const repos = [];

  for (const state of states) {
    if (!state.clonePath) continue;
    const size = getDirSize(state.clonePath);
    totalBytes += size;

    const repo = db.select().from(starredRepos).where(eq(starredRepos.id, state.repoId)).get();
    repos.push({
      repoId: state.repoId,
      fullName: repo?.fullName ?? "Unknown",
      clonePath: state.clonePath,
      bytes: size,
      formatted: formatBytes(size),
    });

    // Update DB
    db.update(repoLocalState)
      .set({ diskUsageBytes: size })
      .where(eq(repoLocalState.repoId, state.repoId))
      .run();
  }

  repos.sort((a, b) => b.bytes - a.bytes);

  return NextResponse.json({
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    repos,
  });
}
