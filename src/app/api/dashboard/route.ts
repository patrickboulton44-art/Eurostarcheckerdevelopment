import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/d1";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = session.user.email;

  // Get user info
  const users = await sql`SELECT id, email, name, tier FROM users WHERE email = ${email}`;
  const user = users[0] || null;

  // Get active watchers
  const watchers = await sql`
    SELECT id, route_id, date_from, date_to, passengers, weekdays, time_slot_pref, active, created_at
    FROM watchers WHERE email = ${email}
    ORDER BY created_at DESC
  `;

  // Get notifications sent to this user's watchers (join avoids a Postgres = ANY(array))
  const notifications = await sql`
    SELECT ns.watcher_id, ns.available_date, ns.sent_at
    FROM notifications_sent ns
    JOIN watchers w ON ns.watcher_id = w.id
    WHERE w.email = ${email}
    ORDER BY ns.sent_at DESC
    LIMIT 50
  `;

  return NextResponse.json({ user, watchers, notifications });
}
