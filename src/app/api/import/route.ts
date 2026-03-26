import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tags, recipes, repoNotes, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import "@/lib/db/migrate";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();

    if (!data.version || data.version !== 1) {
      return NextResponse.json({ error: "Unsupported export version" }, { status: 400 });
    }

    let imported = 0;

    // Import tags
    if (data.tags?.length) {
      for (const tag of data.tags) {
        const existing = db.select().from(tags).where(eq(tags.name, tag.name)).get();
        if (!existing) {
          db.insert(tags).values({ name: tag.name, color: tag.color }).run();
          imported++;
        }
      }
    }

    // Import recipes (match by repo ID)
    if (data.recipes?.length) {
      for (const recipe of data.recipes) {
        const existing = db.select().from(recipes).where(eq(recipes.repoId, recipe.repoId)).get();
        if (!existing) {
          db.insert(recipes).values({
            repoId: recipe.repoId,
            detectedType: recipe.detectedType,
            installCommand: recipe.installCommand,
            runCommand: recipe.runCommand,
            envVars: recipe.envVars,
            preHooks: recipe.preHooks,
            postHooks: recipe.postHooks,
            approved: recipe.approved,
          }).run();
          imported++;
        }
      }
    }

    // Import notes
    if (data.repoNotes?.length) {
      for (const note of data.repoNotes) {
        const existing = db.select().from(repoNotes).where(eq(repoNotes.repoId, note.repoId)).get();
        if (!existing) {
          db.insert(repoNotes).values({
            repoId: note.repoId,
            content: note.content,
          }).run();
          imported++;
        }
      }
    }

    // Import settings
    if (data.settings?.length) {
      for (const setting of data.settings) {
        db.insert(settings)
          .values({ key: setting.key, value: setting.value })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: setting.value },
          })
          .run();
        imported++;
      }
    }

    return NextResponse.json({ ok: true, message: `${imported} items imported` });
  } catch (error) {
    return NextResponse.json({ error: "Invalid import data" }, { status: 400 });
  }
}
