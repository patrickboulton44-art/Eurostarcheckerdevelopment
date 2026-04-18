import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.STORAGE_URL;
  if (!url) throw new Error("DATABASE_URL or STORAGE_URL is not set");
  return neon(url);
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both fields required" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`SELECT password_hash FROM users WHERE email = ${session.user.email}`;

  if (rows.length === 0 || !rows[0].password_hash) {
    return NextResponse.json({ error: "Password change not available for Google accounts" }, { status: 400 });
  }

  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await sql`UPDATE users SET password_hash = ${newHash} WHERE email = ${session.user.email}`;

  return NextResponse.json({ success: true });
}
