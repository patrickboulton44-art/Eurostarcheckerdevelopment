import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { addBrevoContact } from "@/lib/email";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.STORAGE_URL;
  if (!url) throw new Error("DATABASE_URL or STORAGE_URL is not set");
  return neon(url);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const sql = getDb();

    // Check if user exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "Account already exists. Try signing in." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await sql`
      INSERT INTO users (email, name, password_hash, tier)
      VALUES (${email}, ${name || ""}, ${passwordHash}, 'free')
    `;

    // Add to Brevo CRM
    await addBrevoContact(email, name, "free");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
