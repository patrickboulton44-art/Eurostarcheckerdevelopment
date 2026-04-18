import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.STORAGE_URL;
  if (!url) throw new Error("DATABASE_URL or STORAGE_URL is not set");
  return neon(url);
}

// PATCH: update watcher settings (passengers, weekdays, time_slot_pref)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { watcherId, passengers, weekdays, timeSlotPref } = await req.json();
  if (!watcherId) {
    return NextResponse.json({ error: "watcherId required" }, { status: 400 });
  }

  const sql = getDb();

  // Verify watcher belongs to this user
  const rows = await sql`SELECT id FROM watchers WHERE id = ${watcherId} AND email = ${session.user.email}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Watcher not found" }, { status: 404 });
  }

  // Build update
  if (passengers !== undefined) {
    const pax = Math.min(Math.max(parseInt(passengers) || 1, 1), 4);
    await sql`UPDATE watchers SET passengers = ${pax} WHERE id = ${watcherId}`;
  }
  if (weekdays !== undefined) {
    const wd = Array.isArray(weekdays) ? weekdays.sort().join(",") : weekdays;
    await sql`UPDATE watchers SET weekdays = ${wd} WHERE id = ${watcherId}`;
  }
  if (timeSlotPref !== undefined) {
    const slot = ["any", "morning", "afternoon"].includes(timeSlotPref) ? timeSlotPref : "any";
    await sql`UPDATE watchers SET time_slot_pref = ${slot} WHERE id = ${watcherId}`;
  }

  return NextResponse.json({ success: true });
}

// DELETE: deactivate a specific watcher
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { watcherId } = await req.json();
  if (!watcherId) {
    return NextResponse.json({ error: "watcherId required" }, { status: 400 });
  }

  const sql = getDb();

  // Verify watcher belongs to this user
  const rows = await sql`SELECT id FROM watchers WHERE id = ${watcherId} AND email = ${session.user.email}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Watcher not found" }, { status: 404 });
  }

  await sql`UPDATE watchers SET active = false WHERE id = ${watcherId}`;

  return NextResponse.json({ success: true });
}
