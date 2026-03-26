import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getReadmeHtml } from "@/lib/readme";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owner = request.nextUrl.searchParams.get("owner");
  const name = request.nextUrl.searchParams.get("name");

  if (!owner || !name) {
    return NextResponse.json({ error: "Missing owner or name" }, { status: 400 });
  }

  const html = await getReadmeHtml(owner, name, session.accessToken);

  if (!html) {
    return NextResponse.json({ error: "README not found" }, { status: 404 });
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
