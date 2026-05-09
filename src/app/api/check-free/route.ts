import { NextRequest, NextResponse } from "next/server";
import { checkAvailability } from "@/lib/scraper";
import {
  initDb,
  getActiveWatchers,
  upsertAvailability,
  hasNotificationBeenSent,
  recordNotification,
} from "@/lib/db";
import { sendEmail, buildAvailabilityEmail } from "@/lib/email";
import { ROUTES } from "@/lib/constants";

export const maxDuration = 60;

// Free cron — runs every 60 min for free non-amnesty watchers only.
// Pro + amnesty watchers are handled by /api/check on a 5-min cadence.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initDb();
    const watchers = await getActiveWatchers("free");

    if (watchers.length === 0) {
      return NextResponse.json({ message: "No active watchers", checked: 0 });
    }

    const routeGroups = new Map<string, typeof watchers>();
    for (const w of watchers) {
      const group = routeGroups.get(w.route_id) || [];
      group.push(w);
      routeGroups.set(w.route_id, group);
    }

    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthList = [
      { year: now.getFullYear(), month: now.getMonth() + 1 },
      { year: next.getFullYear(), month: next.getMonth() + 1 },
    ];

    let totalChecked = 0;
    let totalNotified = 0;

    async function processRoute(routeId: string, groupWatchers: typeof watchers) {
      const route = ROUTES.find((r) => r.id === routeId);
      if (!route) return;

      for (const m of monthList) {
        try {
          const availability = await checkAvailability(route.originCode, route.destCode, m.year, m.month);

          for (const slot of availability) {
            await upsertAvailability(routeId, slot.date, slot.price);
          }
          totalChecked++;

          for (const watcher of groupWatchers) {
            const watcherWeekdays = (watcher.weekdays || "0,1,2,3,4,5,6").split(",").map(Number);
            const matchingDates = availability.filter((a) => {
              const d = new Date(a.date);
              return d >= new Date(watcher.date_from) && d <= new Date(watcher.date_to) && a.available && watcherWeekdays.includes(d.getDay());
            });

            const newDates = [];
            for (const d of matchingDates) {
              const alreadySent = await hasNotificationBeenSent(watcher.id, d.date);
              if (!alreadySent) newDates.push(d);
            }

            if (newDates.length > 0) {
              const html = buildAvailabilityEmail(
                route.origin,
                route.destination,
                newDates,
                watcher.unsubscribe_token,
                route.originCode,
                route.destCode,
                watcher.passengers
              );

              await sendEmail({
                to: watcher.email,
                subject: `🚄 Snap dates available: ${route.origin} → ${route.destination}`,
                html,
              });

              for (const d of newDates) {
                await recordNotification(watcher.id, d.date);
              }
              totalNotified++;
            }
          }
        } catch (err) {
          console.error(`Error checking ${routeId} ${m.year}-${m.month}:`, err);
        }
      }
    }

    await Promise.all(
      Array.from(routeGroups).map(([routeId, groupWatchers]) => processRoute(routeId, groupWatchers))
    );

    return NextResponse.json({
      message: "Check complete",
      routesChecked: totalChecked,
      notificationsSent: totalNotified,
    });
  } catch (error) {
    console.error("Check-free error:", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
