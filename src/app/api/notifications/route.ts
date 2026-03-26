import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllNotifications, getUnreadNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
  const notifs = unreadOnly ? getUnreadNotifications() : getAllNotifications();
  return NextResponse.json(notifs);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, id } = await request.json();

  if (action === "read" && id) {
    markNotificationRead(id);
  } else if (action === "read-all") {
    markAllNotificationsRead();
  }

  return NextResponse.json({ ok: true });
}
