import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { addBrevoContact } from "@/lib/email";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.STORAGE_URL;
  if (!url) throw new Error("DATABASE_URL or STORAGE_URL is not set");
  return neon(url);
}

// One-time migration: push all existing users to Brevo
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  const users = await sql`SELECT email, name, tier FROM users`;

  let migrated = 0;
  for (const user of users) {
    await addBrevoContact(user.email, user.name, user.tier);
    migrated++;
  }

  return NextResponse.json({ success: true, migrated });
}
