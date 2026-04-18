import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.STORAGE_URL;
  if (!url) throw new Error("DATABASE_URL or STORAGE_URL is not set");
  return neon(url);
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sql = getDb();

  // Get user info
  const users = await sql`SELECT id, email, name, tier FROM users WHERE email = ${session.user.email}`;
  const user = users[0] || null;

  // Get active watchers
  const watchers = await sql`
    SELECT id, route_id, date_from, date_to, passengers, weekdays, time_slot_pref, active, created_at
    FROM watchers WHERE email = ${session.user.email}
    ORDER BY created_at DESC
  `;

  // Get notifications sent to this user's watchers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const watcherIds = watchers.map((w: any) => w.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notifications: any[] = [];
  if (watcherIds.length > 0) {
    notifications = await sql`
      SELECT ns.watcher_id, ns.available_date, ns.sent_at
      FROM notifications_sent ns
      WHERE ns.watcher_id = ANY(${watcherIds})
      ORDER BY ns.sent_at DESC
      LIMIT 50
    `;
  }

  return NextResponse.json({ user, watchers, notifications });
}
