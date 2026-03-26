import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { starredRepos, tags, repoTags, repoLocalState } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { processManager } from "@/lib/process-manager";
import fs from "fs";
import "@/lib/db/migrate";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, repoIds, tagName, tagColor } = await request.json();

  if (!action || !repoIds?.length) {
    return NextResponse.json({ error: "Missing action or repoIds" }, { status: 400 });
  }

  switch (action) {
    case "add-tag": {
      if (!tagName) return NextResponse.json({ error: "Missing tagName" }, { status: 400 });

      // Create tag if it doesn't exist
      let tag = db.select().from(tags).where(eq(tags.name, tagName)).get();
      if (!tag) {
        tag = db.insert(tags).values({ name: tagName, color: tagColor ?? "#6366f1" }).returning().get();
      }

      // Link tag to repos
      for (const repoId of repoIds) {
        const existing = db.select().from(repoTags)
          .where(eq(repoTags.repoId, repoId))
          .all()
          .find((rt) => rt.tagId === tag!.id);
        if (!existing) {
          db.insert(repoTags).values({ tagId: tag.id, repoId }).run();
        }
      }
      return NextResponse.json({ ok: true, tagged: repoIds.length });
    }

    case "delete-clones": {
      let deleted = 0;
      for (const repoId of repoIds) {
        const state = db.select().from(repoLocalState).where(eq(repoLocalState.repoId, repoId)).get();
        if (state?.clonePath) {
          processManager.stop(repoId);
          try {
            fs.rmSync(state.clonePath, { recursive: true, force: true });
          } catch { /* ignore */ }
          db.delete(repoLocalState).where(eq(repoLocalState.repoId, repoId)).run();
          deleted++;
        }
      }
      return NextResponse.json({ ok: true, deleted });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
