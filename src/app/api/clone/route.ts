import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processManager } from "@/lib/process-manager";
import { getRepoByFullName, upsertRepoLocalState } from "@/lib/queries";
import { detectProjectType } from "@/lib/recipe-detector";
import { upsertRepoRecipe } from "@/lib/queries";
import path from "path";
import fs from "fs";

const CLONE_DIR = process.env.CLONE_DIRECTORY?.replace("~", process.env.HOME ?? "") ?? path.join(process.env.HOME ?? "", "stardeck-repos");

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, name } = await request.json();
  if (!owner || !name) return NextResponse.json({ error: "Missing owner or name" }, { status: 400 });

  const repo = getRepoByFullName(owner, name);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

  // Ensure clone directory exists
  if (!fs.existsSync(CLONE_DIR)) {
    fs.mkdirSync(CLONE_DIR, { recursive: true });
  }

  const targetDir = path.join(CLONE_DIR, `${owner}--${name}`);

  // Check if already cloned
  if (fs.existsSync(targetDir)) {
    return NextResponse.json({ error: "Already cloned", clonePath: targetDir }, { status: 409 });
  }

  // Start clone
  const managed = processManager.clone(repo.id, repo.fullName, targetDir);

  // Update local state
  upsertRepoLocalState(repo.id, {
    clonePath: targetDir,
    processStatus: "installing",
  });

  // When clone finishes, detect project type and create recipe
  managed.child.on("exit", (code) => {
    if (code === 0) {
      try {
        const files = fs.readdirSync(targetDir);
        const detected = detectProjectType(files);
        upsertRepoRecipe(repo.id, {
          detectedType: detected.detectedType,
          installCommand: detected.installCommand,
          runCommand: detected.runCommand,
          approved: false,
        });
        upsertRepoLocalState(repo.id, { processStatus: "stopped" });
      } catch {
        upsertRepoLocalState(repo.id, { processStatus: "error" });
      }
    } else {
      upsertRepoLocalState(repo.id, { processStatus: "error" });
    }
  });

  return NextResponse.json({ ok: true, pid: managed.pid, clonePath: targetDir });
}
