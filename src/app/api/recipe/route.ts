import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRepoByFullName, getRepoRecipe, upsertRepoRecipe } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = request.nextUrl.searchParams.get("owner");
  const name = request.nextUrl.searchParams.get("name");
  if (!owner || !name) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const repo = getRepoByFullName(owner, name);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recipe = getRepoRecipe(repo.id);
  return NextResponse.json(recipe ?? null);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { owner, name, ...recipeData } = body;

  const repo = getRepoByFullName(owner, name);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  upsertRepoRecipe(repo.id, recipeData);
  return NextResponse.json({ ok: true });
}
