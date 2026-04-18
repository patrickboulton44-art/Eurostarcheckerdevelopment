import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import { deleteBrevoContact } from "@/lib/email";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.STORAGE_URL;
  if (!url) throw new Error("DATABASE_URL or STORAGE_URL is not set");
  return neon(url);
}

export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = session.user.email;
  const sql = getDb();

  // Delete notifications for user's watchers
  const watchers = await sql`SELECT id FROM watchers WHERE email = ${email}`;
  for (const w of watchers) {
    await sql`DELETE FROM notifications_sent WHERE watcher_id = ${w.id}`;
  }

  // Delete watchers
  await sql`DELETE FROM watchers WHERE email = ${email}`;

  // Delete user
  await sql`DELETE FROM users WHERE email = ${email}`;

  // Delete from Brevo
  await deleteBrevoContact(email);

  return NextResponse.json({ success: true });
}
