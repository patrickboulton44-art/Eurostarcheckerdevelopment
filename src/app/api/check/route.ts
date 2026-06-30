import { NextRequest, NextResponse } from "next/server";
import { checkAvailabilityDetailed } from "@/lib/scraper";
import {
  getActiveWatchers,
  upsertAvailability,
  hasNotificationBeenSent,
  recordNotification,
  recordMonitorRun,
  markMonitorAlerted,
} from "@/lib/db";
import { sendEmail, buildAvailabilityEmail } from "@/lib/email";
import { ROUTES } from "@/lib/constants";

const OWNER_EMAIL = process.env.OWNER_EMAIL || "patrickboulton44@gmail.com";
// Alert after this many consecutive bad runs (~5 min each → 15 min of failure).
const BAD_RUN_ALERT_THRESHOLD = 3;
// Don't re-alert more than once per this many hours during a sustained outage.
const ALERT_COOLDOWN_HOURS = 6;

export const maxDuration = 60;

// Instant cron — runs every 5 min for pro + amnesty watchers only.
// Free non-amnesty watchers are handled by /api/check-free on a 60-min cadence.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const watchers = await getActiveWatchers("instant");

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
    let routesAttempted = 0;
    let routesHealthy = 0;

    async function processRoute(routeId: string, groupWatchers: typeof watchers) {
      const route = ROUTES.find((r) => r.id === routeId);
      if (!route) return;

      for (const m of monthList) {
        try {
          routesAttempted++;
          const result = await checkAvailabilityDetailed(route.originCode, route.destCode, m.year, m.month);
          if (result.healthy) routesHealthy++;
          const availability = result.dates;

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

    // Dead-man's switch: record this run's scraper health and alert the owner if
    // the scraper has been failing for several consecutive runs. A "bad" run is
    // one where fewer than half the route-months returned a structurally valid
    // page — that distinguishes a broken/blocked scraper from Eurostar simply
    // being sold out (which still returns healthy, empty pages).
    let monitorAlertSent = false;
    try {
      const state = await recordMonitorRun(routesHealthy, routesAttempted);
      if (state.consecutive_bad_runs >= BAD_RUN_ALERT_THRESHOLD) {
        // D1 stores "YYYY-MM-DD HH:MM:SS" (UTC, no T/Z) — normalise to ISO so V8 parses it as UTC.
        const lastAlert = state.last_alert_at ? new Date(state.last_alert_at.replace(" ", "T") + "Z").getTime() : 0;
        const cooledDown = Date.now() - lastAlert > ALERT_COOLDOWN_HOURS * 3600_000;
        if (cooledDown) {
          await sendEmail({
            to: OWNER_EMAIL,
            subject: "⚠️ Eurosnap scraper is failing",
            html: `<p>The Eurosnap scraper has returned unhealthy results for ${state.consecutive_bad_runs} consecutive runs.</p>
<p>Latest run: <strong>${routesHealthy}/${routesAttempted}</strong> route-months scraped a valid page.</p>
<p>This usually means Eurostar changed their page, is blocking us, or the worker hit a limit — it is <em>not</em> the same as Eurostar being sold out (that still scrapes cleanly). Check <code>wrangler tail eurosnap</code>.</p>`,
          });
          await markMonitorAlerted();
          monitorAlertSent = true;
        }
      }
    } catch (err) {
      console.error("Monitor recording failed:", err);
    }

    return NextResponse.json({
      message: "Check complete",
      routesChecked: totalChecked,
      routesHealthy,
      routesAttempted,
      notificationsSent: totalNotified,
      monitorAlertSent,
    });
  } catch (error) {
    console.error("Check error:", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
