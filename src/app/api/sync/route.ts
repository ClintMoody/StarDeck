import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncStarredRepos } from "@/lib/sync";
import "@/lib/db/migrate";

export async function POST(request: NextRequest) {
  const internalToken = request.headers.get("x-internal-token");
  let accessToken: string | undefined;

  if (internalToken) {
    accessToken = internalToken;
  } else {
    const session = await auth();
    accessToken = session?.accessToken;
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncStarredRepos(db, accessToken);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
