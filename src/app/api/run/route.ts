import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processManager } from "@/lib/process-manager";
import { getRepoByFullName, getRepoLocalState, getRepoRecipe, upsertRepoLocalState } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, name, command } = await request.json();
  if (!owner || !name) return NextResponse.json({ error: "Missing owner or name" }, { status: 400 });

  const repo = getRepoByFullName(owner, name);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

  const localState = getRepoLocalState(repo.id);
  if (!localState?.clonePath) {
    return NextResponse.json({ error: "Repo not cloned yet" }, { status: 400 });
  }

  // Get command to run: explicit command > recipe > fallback
  let runCommand = command;
  if (!runCommand) {
    const recipe = getRepoRecipe(repo.id);
    if (recipe?.installCommand && recipe?.runCommand) {
      runCommand = `${recipe.installCommand} && ${recipe.runCommand}`;
    } else if (recipe?.runCommand) {
      runCommand = recipe.runCommand;
    } else {
      return NextResponse.json({ error: "No recipe found. Clone first or provide a command." }, { status: 400 });
    }
  }

  const managed = processManager.run(repo.id, runCommand, localState.clonePath);

  upsertRepoLocalState(repo.id, { processStatus: "running" });

  return NextResponse.json({ ok: true, pid: managed.pid });
}
