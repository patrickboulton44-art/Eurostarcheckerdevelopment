import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/d1";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const rows = await sql<{ stripe_customer_id: string | null }>`
      SELECT stripe_customer_id FROM users WHERE email = ${session.user.email}
    `;

    let customerId = rows[0]?.stripe_customer_id ?? null;

    // Fallback: if no customer_id stored (e.g. user marked Pro manually,
    // or checkout pre-dates webhook), look them up in Stripe by email.
    if (!customerId) {
      const stripe = getStripe();
      const customers = await stripe.customers.list({ email: session.user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        // Persist for next time
        await sql`
          UPDATE users SET stripe_customer_id = ${customerId} WHERE email = ${session.user.email}
        `;
      }
    }

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
