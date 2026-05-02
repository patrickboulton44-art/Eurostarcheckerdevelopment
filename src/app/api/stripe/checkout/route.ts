import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eurosnap.app";

  try {
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      customer_email: session.user.email,
      allow_promotion_codes: true,
      success_url: `${baseUrl}/dashboard?upgraded=true`,
      cancel_url: `${baseUrl}/pricing?cancelled=true`,
      metadata: {
        userEmail: session.user.email,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
