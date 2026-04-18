import { NextRequest, NextResponse } from "next/server";
import { sendEmail, buildAvailabilityEmail } from "@/lib/email";

const ROUTE_DATA: Record<string, { origin: string; dest: string; originCode: string; destCode: string }> = {
  "lon-par": { origin: "London", dest: "Paris", originCode: "7015400", destCode: "8727100" },
  "lon-ams": { origin: "London", dest: "Amsterdam", originCode: "7015400", destCode: "8400058" },
  "lon-rot": { origin: "London", dest: "Rotterdam", originCode: "7015400", destCode: "8400530" },
  "lon-bru": { origin: "London", dest: "Brussels", originCode: "7015400", destCode: "8814001" },
  "par-lon": { origin: "Paris", dest: "London", originCode: "8727100", destCode: "7015400" },
};

// GET /api/test-email?to=email&secret=X&route=lon-par (route optional, defaults to lon-par)
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const to = req.nextUrl.searchParams.get("to");
  const routeId = req.nextUrl.searchParams.get("route") || "lon-par";

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!to) {
    return NextResponse.json({ error: "Missing 'to' parameter" }, { status: 400 });
  }

  const route = ROUTE_DATA[routeId] || ROUTE_DATA["lon-par"];

  const fakeDates = [
    { date: "2026-04-09", price: 6000 },
    { date: "2026-04-11", price: 5000 },
    { date: "2026-04-14", price: 3500 },
  ];

  const html = buildAvailabilityEmail(
    route.origin,
    route.dest,
    fakeDates,
    "test-unsubscribe-token",
    route.originCode,
    route.destCode,
    1
  );

  await sendEmail({
    to,
    subject: `Snap dates available: ${route.origin} → ${route.dest}`,
    html,
  });

  return NextResponse.json({ success: true, sentTo: to, route: `${route.origin} → ${route.dest}` });
}
