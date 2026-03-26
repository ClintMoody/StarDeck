import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tags, repoTags, recipes, repoNotes, settings } from "@/lib/db/schema";
import "@/lib/db/migrate";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tags: db.select().from(tags).all(),
    repoTags: db.select().from(repoTags).all(),
    recipes: db.select().from(recipes).all(),
    repoNotes: db.select().from(repoNotes).all(),
    settings: db.select().from(settings).all(),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="stardeck-export.json"`,
    },
  });
}
