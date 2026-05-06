import { NextRequest, NextResponse } from "next/server";
import { addWatcher, initDb } from "@/lib/db";
import { ROUTES } from "@/lib/constants";
import { sendEmail, buildConfirmationEmail } from "@/lib/email";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.STORAGE_URL;
  if (!url) throw new Error("DATABASE_URL or STORAGE_URL is not set");
  return neon(url);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, routeId, dateFrom, dateTo, passengers, weekdays, timeSlotPref } = body;

    // Validate
    if (!email || !routeId || !dateFrom || !dateTo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const route = ROUTES.find((r) => r.id === routeId);
    if (!route) {
      return NextResponse.json({ error: "Invalid route" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const pax = Math.min(Math.max(parseInt(passengers) || 1, 1), 4);
    const unsubscribeToken = crypto.randomUUID();

    await initDb();

    // Check user tier — enforce free limits on backend
    const sql = getDb();
    const users = await sql`SELECT tier, amnesty FROM users WHERE email = ${email}`;
    const userTier = users.length > 0 ? users[0].tier : "free";
    const userAmnesty = users.length > 0 ? users[0].amnesty === true : false;
    const instantAccess = userTier === "pro" || userAmnesty;

    // Free users: force all weekdays + any time slot
    const weekdayStr = userTier === "pro" && Array.isArray(weekdays)
      ? weekdays.sort().join(",")
      : "0,1,2,3,4,5,6";
    const slotPref = userTier === "pro" && ["morning", "afternoon"].includes(timeSlotPref)
      ? timeSlotPref
      : "any";

    await addWatcher(email, routeId, dateFrom, dateTo, pax, unsubscribeToken, weekdayStr, slotPref);

    // Send confirmation email
    const confirmHtml = buildConfirmationEmail(
      route.origin,
      route.destination,
      dateFrom,
      dateTo,
      pax,
      unsubscribeToken,
      instantAccess
    );

    await sendEmail({
      to: email,
      subject: `Watching: ${route.origin} → ${route.destination} Snap deals`,
      html: confirmHtml,
    });

    return NextResponse.json({
      success: true,
      message: `You'll be notified when Snap dates open for ${route.origin} → ${route.destination}`,
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
