import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/d1";
import { initDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { addBrevoContact } from "@/lib/email";

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

    await initDb();

    // Check if user exists
    const existing = await sql<{ id: number }>`SELECT id FROM users WHERE email = ${email}`;
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
