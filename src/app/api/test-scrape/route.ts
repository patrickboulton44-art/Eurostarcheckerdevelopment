import { NextRequest, NextResponse } from "next/server";
import { checkAvailability } from "@/lib/scraper";
import { ROUTES } from "@/lib/constants";

// Public test endpoint — returns raw availability data for a route
export async function GET(req: NextRequest) {
  const routeId = req.nextUrl.searchParams.get("route") || "lon-par";
  const monthParam = req.nextUrl.searchParams.get("month"); // YYYY-MM format

  const route = ROUTES.find((r) => r.id === routeId);
  if (!route) {
    return NextResponse.json({ error: "Invalid route" }, { status: 400 });
  }

  const now = new Date();
  const year = monthParam ? parseInt(monthParam.split("-")[0]) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam.split("-")[1]) : now.getMonth() + 1;

  try {
    const availability = await checkAvailability(
      route.originCode,
      route.destCode,
      year,
      month
    );

    return NextResponse.json({
      route: `${route.origin} → ${route.destination}`,
      month: `${year}-${String(month).padStart(2, "0")}`,
      datesFound: availability.length,
      availability: availability.map((a) => ({
        date: a.date,
        price: a.price ? `£${(a.price / 100).toFixed(2)}` : null,
        available: a.available,
        timeSlots: a.timeSlots.map((s) => ({
          slot: s.slot,
          time: `${s.earliest}–${s.latest}`,
          price: s.price ? `£${(s.price / 100).toFixed(2)}` : null,
          available: s.available,
        })),
      })),
    });
  } catch (error) {
    console.error("Test scrape error:", error);
    return NextResponse.json({ error: "Scrape failed", detail: String(error) }, { status: 500 });
  }
}
