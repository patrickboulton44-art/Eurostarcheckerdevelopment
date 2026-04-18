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

// This endpoint is called by an external cron service (e.g. cron-job.org)
// Protected by a secret token
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initDb();
    const watchers = await getActiveWatchers();

    if (watchers.length === 0) {
      return NextResponse.json({ message: "No active watchers", checked: 0 });
    }

    // Group watchers by route to minimize scraping calls
    const routeGroups = new Map<string, typeof watchers>();
    for (const w of watchers) {
      const group = routeGroups.get(w.route_id) || [];
      group.push(w);
      routeGroups.set(w.route_id, group);
    }

    let totalChecked = 0;
    let totalNotified = 0;

    for (const [routeId, groupWatchers] of routeGroups) {
      const route = ROUTES.find((r) => r.id === routeId);
      if (!route) continue;

      // Check current month + next month only (keeps within Vercel 10s timeout)
      const now = new Date();
      const months = new Set<string>();
      months.add(`${now.getFullYear()}-${now.getMonth() + 1}`);
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      months.add(`${next.getFullYear()}-${next.getMonth() + 1}`);

      // Check each month
      for (const monthKey of months) {
        const [year, month] = monthKey.split("-").map(Number);
        try {
          const availability = await checkAvailability(
            route.originCode,
            route.destCode,
            year,
            month
          );

          // Cache results
          for (const slot of availability) {
            await upsertAvailability(routeId, slot.date, slot.price);
          }

          totalChecked++;

          // Check each watcher against results
          for (const watcher of groupWatchers) {
            const watcherWeekdays = (watcher.weekdays || "0,1,2,3,4,5,6").split(",").map(Number);
            const matchingDates = availability.filter((a) => {
              const d = new Date(a.date);
              return d >= new Date(watcher.date_from) && d <= new Date(watcher.date_to) && a.available && watcherWeekdays.includes(d.getDay());
            });

            // Filter out dates we've already notified about
            const newDates = [];
            for (const d of matchingDates) {
              const alreadySent = await hasNotificationBeenSent(watcher.id, d.date);
              if (!alreadySent) newDates.push(d);
            }

            if (newDates.length > 0) {
              // Send notification
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

              // Record sent notifications
              for (const d of newDates) {
                await recordNotification(watcher.id, d.date);
              }
              totalNotified++;
            }
          }
        } catch (err) {
          console.error(`Error checking ${routeId} ${monthKey}:`, err);
        }
      }
    }

    return NextResponse.json({
      message: "Check complete",
      routesChecked: totalChecked,
      notificationsSent: totalNotified,
    });
  } catch (error) {
    console.error("Check error:", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
