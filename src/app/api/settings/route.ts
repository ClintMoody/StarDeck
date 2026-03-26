import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSetting, setSetting, getAllSettings } from "@/lib/queries";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getAllSettings());
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key, value } = await request.json();
  if (!key || typeof value !== "string") {
    return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
  }

  setSetting(key, value);
  return NextResponse.json({ ok: true });
}
