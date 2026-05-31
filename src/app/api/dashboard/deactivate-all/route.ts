import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/d1";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await sql`UPDATE watchers SET active = 0 WHERE email = ${session.user.email}`;

  return NextResponse.json({ success: true });
}
