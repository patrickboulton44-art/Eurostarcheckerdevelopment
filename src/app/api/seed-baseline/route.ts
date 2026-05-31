import { NextRequest, NextResponse } from "next/server";
import { checkAvailability } from "@/lib/scraper";
import {
  getActiveWatchers,
  upsertAvailability,
  hasNotificationBeenSent,
  recordNotification,
} from "@/lib/db";
import { ROUTES } from "@/lib/constants";

export const maxDuration = 60;

// ONE-TIME cutover step. Absorbs the current availability backlog so users are
// NOT barraged when alerts resume after the outage. For every active watcher it
// records all currently-matching dates into notifications_sent *without sending
// any email*. After this runs once, only availability that appears AFTERWARDS
// triggers alerts — i.e. users only get emails going forward.
//
// Run once, after data migration and BEFORE enabling the cron schedule:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/seed-baseline
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // All active watchers, regardless of tier — everyone gets a clean baseline.
    const watchers = await getActiveWatchers();

    if (watchers.length === 0) {
      return NextResponse.json({ message: "No active watchers", suppressed: 0 });
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

    let totalSuppressed = 0;
    let watchersSeeded = 0;

    async function seedRoute(routeId: string, groupWatchers: typeof watchers) {
      const route = ROUTES.find((r) => r.id === routeId);
      if (!route) return;

      for (const m of monthList) {
        try {
          const availability = await checkAvailability(route.originCode, route.destCode, m.year, m.month);

          for (const slot of availability) {
            await upsertAvailability(routeId, slot.date, slot.price);
          }

          for (const watcher of groupWatchers) {
            const watcherWeekdays = (watcher.weekdays || "0,1,2,3,4,5,6").split(",").map(Number);
            const matchingDates = availability.filter((a) => {
              const d = new Date(a.date);
              return d >= new Date(watcher.date_from) && d <= new Date(watcher.date_to) && a.available && watcherWeekdays.includes(d.getDay());
            });

            let seededForWatcher = 0;
            for (const d of matchingDates) {
              const alreadySent = await hasNotificationBeenSent(watcher.id, d.date);
              if (!alreadySent) {
                // Record as already-notified WITHOUT emailing — absorbs the backlog.
                await recordNotification(watcher.id, d.date);
                totalSuppressed++;
                seededForWatcher++;
              }
            }
            if (seededForWatcher > 0) watchersSeeded++;
          }
        } catch (err) {
          console.error(`Seed error ${routeId} ${m.year}-${m.month}:`, err);
        }
      }
    }

    await Promise.all(
      Array.from(routeGroups).map(([routeId, groupWatchers]) => seedRoute(routeId, groupWatchers))
    );

    return NextResponse.json({
      message: "Baseline seeded — current availability suppressed, alerts are now forward-only.",
      watchersSeeded,
      datesSuppressed: totalSuppressed,
    });
  } catch (error) {
    console.error("Seed baseline error:", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
