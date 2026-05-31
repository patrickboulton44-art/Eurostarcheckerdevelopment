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
    const rows = await sql<{ stripe_customer_id: string | null; stripe_subscription_id: string | null }>`
      SELECT stripe_customer_id, stripe_subscription_id FROM users WHERE email = ${session.user.email}
    `;

    let customerId = rows[0]?.stripe_customer_id ?? null;
    let subscriptionId = rows[0]?.stripe_subscription_id ?? null;
    const stripe = getStripe();

    if (!customerId) {
      const customers = await stripe.customers.list({ email: session.user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        await sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE email = ${session.user.email}`;
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    if (!subscriptionId) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (subs.data.length === 0) {
        return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
      }
      subscriptionId = subs.data[0].id;
      await sql`UPDATE users SET stripe_subscription_id = ${subscriptionId} WHERE email = ${session.user.email}`;
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({
      message: "Subscription will end at the end of the current billing period.",
      cancelAt: updated.cancel_at,
    });
  } catch (error) {
    console.error("Stripe cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
