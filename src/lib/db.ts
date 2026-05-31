import { sql } from "./d1";

/**
 * Data layer — Cloudflare D1 (SQLite).
 * Ported from the previous @neondatabase/serverless (Postgres) implementation.
 * Schema lives in db/schema.sql; initDb() keeps a SQLite-valid, idempotent
 * safety net for fresh databases (no Postgres-only ALTER ... IF NOT EXISTS).
 */

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT,
      google_id TEXT,
      tier TEXT NOT NULL DEFAULT 'free',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      amnesty INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS watchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      route_id TEXT NOT NULL,
      date_from TEXT NOT NULL,
      date_to TEXT NOT NULL,
      passengers INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      unsubscribe_token TEXT NOT NULL,
      weekdays TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
      time_slot_pref TEXT NOT NULL DEFAULT 'any',
      UNIQUE(email, route_id, date_from, date_to)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS availability_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id TEXT NOT NULL,
      available_date TEXT NOT NULL,
      price_cents INTEGER,
      checked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(route_id, available_date)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS notifications_sent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watcher_id INTEGER NOT NULL REFERENCES watchers(id),
      available_date TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(watcher_id, available_date)
    )
  `;
}

export async function addWatcher(
  email: string,
  routeId: string,
  dateFrom: string,
  dateTo: string,
  passengers: number,
  unsubscribeToken: string,
  weekdays: string = "0,1,2,3,4,5,6",
  timeSlotPref: string = "any"
) {
  await sql`
    INSERT INTO watchers (email, route_id, date_from, date_to, passengers, unsubscribe_token, weekdays, time_slot_pref)
    VALUES (${email}, ${routeId}, ${dateFrom}, ${dateTo}, ${passengers}, ${unsubscribeToken}, ${weekdays}, ${timeSlotPref})
    ON CONFLICT (email, route_id, date_from, date_to)
    DO UPDATE SET active = 1, passengers = ${passengers}, weekdays = ${weekdays}, time_slot_pref = ${timeSlotPref}
  `;
}

export interface WatcherRow {
  id: number;
  email: string;
  route_id: string;
  date_from: string;
  date_to: string;
  passengers: number;
  active: number;
  created_at: string;
  unsubscribe_token: string;
  weekdays: string;
  time_slot_pref: string;
}

export async function getActiveWatchers(tier?: "instant" | "free"): Promise<WatcherRow[]> {
  if (tier === "instant") {
    return sql<WatcherRow>`
      SELECT w.* FROM watchers w
      JOIN users u ON w.email = u.email
      WHERE w.active = 1 AND (u.tier = 'pro' OR u.amnesty = 1)
    `;
  }
  if (tier === "free") {
    return sql<WatcherRow>`
      SELECT w.* FROM watchers w
      JOIN users u ON w.email = u.email
      WHERE w.active = 1 AND u.tier = 'free' AND u.amnesty = 0
    `;
  }
  return sql<WatcherRow>`SELECT * FROM watchers WHERE active = 1`;
}

export async function deactivateWatcher(unsubscribeToken: string) {
  await sql`UPDATE watchers SET active = 0 WHERE unsubscribe_token = ${unsubscribeToken}`;
}

export async function upsertAvailability(routeId: string, date: string, priceCents: number | null) {
  await sql`
    INSERT INTO availability_cache (route_id, available_date, price_cents, checked_at)
    VALUES (${routeId}, ${date}, ${priceCents}, datetime('now'))
    ON CONFLICT (route_id, available_date)
    DO UPDATE SET price_cents = ${priceCents}, checked_at = datetime('now')
  `;
}

export async function getAvailability(routeId: string) {
  return sql`
    SELECT available_date, price_cents, checked_at
    FROM availability_cache
    WHERE route_id = ${routeId} AND checked_at > datetime('now', '-2 hours')
    ORDER BY available_date
  `;
}

export async function hasNotificationBeenSent(watcherId: number, date: string) {
  const rows = await sql`
    SELECT 1 FROM notifications_sent WHERE watcher_id = ${watcherId} AND available_date = ${date}
  `;
  return rows.length > 0;
}

export async function recordNotification(watcherId: number, date: string) {
  await sql`
    INSERT INTO notifications_sent (watcher_id, available_date)
    VALUES (${watcherId}, ${date})
    ON CONFLICT (watcher_id, available_date) DO NOTHING
  `;
}

export interface UserRow {
  id: number;
  email: string;
  tier: string;
  amnesty: boolean;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await sql<{ id: number; email: string; tier: string; amnesty: number }>`
    SELECT id, email, tier, amnesty FROM users WHERE email = ${email} LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, email: row.email, tier: row.tier, amnesty: !!row.amnesty };
}
