import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/d1";
import { addBrevoContact } from "@/lib/email";

// One-time migration: push all existing users to Brevo
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await sql<{ email: string; name: string; tier: string }>`SELECT email, name, tier FROM users`;

  let migrated = 0;
  for (const user of users) {
    await addBrevoContact(user.email, user.name, user.tier);
    migrated++;
  }

  return NextResponse.json({ success: true, migrated });
}
