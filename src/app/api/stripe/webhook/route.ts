import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/d1";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email || session.metadata?.userEmail;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (email) {
        await sql`
          UPDATE users SET tier = 'pro', stripe_customer_id = ${customerId}, stripe_subscription_id = ${subscriptionId}
          WHERE email = ${email}
        `;
        console.log(`[stripe] Upgraded ${email} to pro`);
      }
      break;
    }

    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const isActive = subscription.status === "active" || subscription.status === "trialing";

      await sql`
        UPDATE users SET tier = ${isActive ? "pro" : "free"}
        WHERE stripe_customer_id = ${customerId}
      `;
      console.log(`[stripe] Customer ${customerId} tier set to ${isActive ? "pro" : "free"}`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
