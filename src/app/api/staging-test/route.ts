// STAGING-ONLY TEST ENDPOINT — DELETE BEFORE MERGING TO PROD
//
// Provides seed + inspect helpers for testing the queue feature on staging.
// Returns 404 unless STAGING=true (which is only set on the staging Vercel project).
// Auth via CRON_SECRET Bearer header.

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { initDb } from "@/lib/db";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.STORAGE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

function isStagingAuthed(req: NextRequest): boolean {
  if (process.env.STAGING !== "true") return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isStagingAuthed(req)) return new NextResponse("Not found", { status: 404 });

  await initDb();
  const sql = getDb();

  const users = await sql`SELECT id, email, tier, amnesty, created_at FROM users ORDER BY id`;
  const watchers = await sql`SELECT id, email, route_id, date_from, date_to, active FROM watchers ORDER BY id`;
  const pending = await sql`
    SELECT id, email, watcher_id, available_date, send_at, sent_at, created_at
    FROM pending_notifications ORDER BY id
  `;
  const sent = await sql`SELECT id, watcher_id, available_date, sent_at FROM notifications_sent ORDER BY id`;
  const amnestyInQueue = await sql`
    SELECT COUNT(*)::int AS c
    FROM pending_notifications p JOIN users u ON p.email = u.email
    WHERE p.sent_at IS NULL AND u.amnesty = true
  `;

  return NextResponse.json({
    users,
    watchers,
    pending_notifications: pending,
    notifications_sent: sent,
    audit_amnesty_in_queue: amnestyInQueue[0]?.c ?? 0,
  });
}

// POST { action: "seed" }       — create 3 test users + 3 watchers
// POST { action: "wipe" }       — delete all test data
// POST { action: "fast-forward" } — set all unsent pending rows' send_at = now (skip the 30 min wait)
export async function POST(req: NextRequest) {
  if (!isStagingAuthed(req)) return new NextResponse("Not found", { status: 404 });

  await initDb();
  const sql = getDb();
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;

  if (action === "seed") {
    // Three users: amnesty (free + amnesty=true), pro, new free (free + amnesty=false)
    await sql`
      INSERT INTO users (email, name, tier, amnesty)
      VALUES
        ('test-amnesty@staging.eurosnap.app', 'Test Amnesty', 'free', true),
        ('test-pro@staging.eurosnap.app', 'Test Pro', 'pro', false),
        ('test-free@staging.eurosnap.app', 'Test Free', 'free', false)
      ON CONFLICT (email) DO UPDATE SET tier = EXCLUDED.tier, amnesty = EXCLUDED.amnesty
    `;

    // Watchers covering a wide date range so any availability triggers
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);

    await sql`
      INSERT INTO watchers (email, route_id, date_from, date_to, passengers, unsubscribe_token, weekdays, time_slot_pref, active)
      VALUES
        ('test-amnesty@staging.eurosnap.app', 'lon-par', ${today}, ${future}, 1, 'staging-token-amnesty', '0,1,2,3,4,5,6', 'any', true),
        ('test-pro@staging.eurosnap.app',     'lon-par', ${today}, ${future}, 1, 'staging-token-pro',     '0,1,2,3,4,5,6', 'any', true),
        ('test-free@staging.eurosnap.app',    'lon-par', ${today}, ${future}, 1, 'staging-token-free',    '0,1,2,3,4,5,6', 'any', true)
      ON CONFLICT (email, route_id, date_from, date_to) DO UPDATE SET active = true
    `;

    return NextResponse.json({ ok: true, action: "seed" });
  }

  if (action === "wipe") {
    await sql`DELETE FROM pending_notifications WHERE email LIKE '%@staging.eurosnap.app'`;
    await sql`DELETE FROM notifications_sent WHERE watcher_id IN (SELECT id FROM watchers WHERE email LIKE '%@staging.eurosnap.app')`;
    await sql`DELETE FROM watchers WHERE email LIKE '%@staging.eurosnap.app'`;
    await sql`DELETE FROM users WHERE email LIKE '%@staging.eurosnap.app'`;
    return NextResponse.json({ ok: true, action: "wipe" });
  }

  if (action === "fast-forward") {
    const r = await sql`
      UPDATE pending_notifications SET send_at = NOW()
      WHERE sent_at IS NULL
      RETURNING id
    `;
    return NextResponse.json({ ok: true, action: "fast-forward", rowsUpdated: r.length });
  }

  return NextResponse.json({ error: "Unknown action. Use seed | wipe | fast-forward" }, { status: 400 });
}
