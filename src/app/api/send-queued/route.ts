import { NextRequest, NextResponse } from "next/server";
import {
  initDb,
  getDuePendingNotifications,
  markPendingSent,
} from "@/lib/db";
import { sendEmail, buildAvailabilityEmail } from "@/lib/email";
import { ROUTES } from "@/lib/constants";

// Drains the pending_notifications queue. Called by cron-job.org every 5 min.
// Auth via CRON_SECRET Bearer token, same as /api/check.

type DueRow = {
  id: number;
  email: string;
  watcher_id: number;
  available_date: string;
  price_cents: number | null;
  route_id: string;
  unsubscribe_token: string;
  passengers: number;
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initDb();
    const rows = (await getDuePendingNotifications()) as DueRow[];

    if (rows.length === 0) {
      return NextResponse.json({ message: "Queue empty", sent: 0 });
    }

    // Group rows by watcher_id so each watcher gets one email per cron tick.
    const byWatcher = new Map<number, DueRow[]>();
    for (const row of rows) {
      const list = byWatcher.get(row.watcher_id) || [];
      list.push(row);
      byWatcher.set(row.watcher_id, list);
    }

    let sentBatches = 0;
    const sentIds: number[] = [];

    for (const [, group] of byWatcher) {
      const first = group[0];
      const route = ROUTES.find((r) => r.id === first.route_id);
      if (!route) continue;

      const dates = group.map((r) => ({
        date: typeof r.available_date === "string"
          ? r.available_date.slice(0, 10)
          : new Date(r.available_date).toISOString().slice(0, 10),
        price: r.price_cents,
      }));

      const html = buildAvailabilityEmail(
        route.origin,
        route.destination,
        dates,
        first.unsubscribe_token,
        route.originCode,
        route.destCode,
        first.passengers
      );

      await sendEmail({
        to: first.email,
        subject: `🚄 Snap dates available: ${route.origin} → ${route.destination}`,
        html,
      });

      sentBatches++;
      for (const r of group) sentIds.push(r.id);
    }

    await markPendingSent(sentIds);

    return NextResponse.json({
      message: "Queue drained",
      sentBatches,
      sentRows: sentIds.length,
    });
  } catch (error) {
    console.error("Send-queued error:", error);
    return NextResponse.json({ error: "Send-queued failed" }, { status: 500 });
  }
}
