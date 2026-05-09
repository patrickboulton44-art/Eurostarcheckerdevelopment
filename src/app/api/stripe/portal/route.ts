import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

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

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT stripe_customer_id FROM users WHERE email = ${session.user.email}
    `;

    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eurosnap.app";
    const portal = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/account`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json({ error: "Failed to open billing portal" }, { status: 500 });
  }
}
