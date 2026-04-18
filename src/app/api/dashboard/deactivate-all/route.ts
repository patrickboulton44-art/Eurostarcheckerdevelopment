import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

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

  const sql = getDb();
  await sql`UPDATE watchers SET active = false WHERE email = ${session.user.email}`;

  return NextResponse.json({ success: true });
}
