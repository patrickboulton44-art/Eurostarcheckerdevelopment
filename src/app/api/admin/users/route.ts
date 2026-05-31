import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/d1";
import { deleteBrevoContact } from "@/lib/email";

// GET: list all users
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await sql`SELECT id, email, name, tier, created_at FROM users ORDER BY created_at DESC`;
  return NextResponse.json({ users });
}

// PATCH: update user tier
export async function PATCH(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, tier } = await req.json();
  if (!email || !tier || !["free", "pro"].includes(tier)) {
    return NextResponse.json({ error: "Email and tier (free/pro) required" }, { status: 400 });
  }

  await sql`UPDATE users SET tier = ${tier} WHERE email = ${email}`;

  return NextResponse.json({ success: true, email, tier });
}

// DELETE: remove a user from both the database and Brevo
export async function DELETE(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Delete watchers and notifications first
  const watchers = await sql<{ id: number }>`SELECT id FROM watchers WHERE email = ${email}`;
  for (const w of watchers) {
    await sql`DELETE FROM notifications_sent WHERE watcher_id = ${w.id}`;
  }
  await sql`DELETE FROM watchers WHERE email = ${email}`;
  await sql`DELETE FROM users WHERE email = ${email}`;

  // Delete from Brevo
  await deleteBrevoContact(email);

  return NextResponse.json({ success: true, deleted: email });
}
