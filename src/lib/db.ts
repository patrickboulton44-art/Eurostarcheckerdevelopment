import { neon } from "@neondatabase/serverless";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.STORAGE_URL;
  if (!url) {
    throw new Error("DATABASE_URL or STORAGE_URL is not set");
  }
  return neon(url);
}

export async function initDb() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT,
      google_id TEXT,
      tier TEXT NOT NULL DEFAULT 'free',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      amnesty BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS amnesty BOOLEAN NOT NULL DEFAULT false`;
  await sql`
    CREATE TABLE IF NOT EXISTS watchers (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      route_id TEXT NOT NULL,
      date_from DATE NOT NULL,
      date_to DATE NOT NULL,
      passengers INT NOT NULL DEFAULT 1,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      unsubscribe_token TEXT NOT NULL,
      weekdays TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
      time_slot_pref TEXT NOT NULL DEFAULT 'any',
      UNIQUE(email, route_id, date_from, date_to)
    )
  `;
  // Migrations
  await sql`ALTER TABLE watchers ADD COLUMN IF NOT EXISTS weekdays TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6'`;
  await sql`ALTER TABLE watchers ADD COLUMN IF NOT EXISTS time_slot_pref TEXT NOT NULL DEFAULT 'any'`;
  await sql`
    CREATE TABLE IF NOT EXISTS availability_cache (
      id SERIAL PRIMARY KEY,
      route_id TEXT NOT NULL,
      available_date DATE NOT NULL,
      price_cents INT,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(route_id, available_date)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS notifications_sent (
      id SERIAL PRIMARY KEY,
      watcher_id INT NOT NULL REFERENCES watchers(id),
      available_date DATE NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  const sql = getDb();
  await sql`
    INSERT INTO watchers (email, route_id, date_from, date_to, passengers, unsubscribe_token, weekdays, time_slot_pref)
    VALUES (${email}, ${routeId}, ${dateFrom}, ${dateTo}, ${passengers}, ${unsubscribeToken}, ${weekdays}, ${timeSlotPref})
    ON CONFLICT (email, route_id, date_from, date_to)
    DO UPDATE SET active = true, passengers = ${passengers}, weekdays = ${weekdays}, time_slot_pref = ${timeSlotPref}
  `;
}

export async function getActiveWatchers(tier?: "instant" | "free") {
  const sql = getDb();
  if (tier === "instant") {
    return sql`
      SELECT w.* FROM watchers w
      JOIN users u ON w.email = u.email
      WHERE w.active = true AND (u.tier = 'pro' OR u.amnesty = true)
    `;
  }
  if (tier === "free") {
    return sql`
      SELECT w.* FROM watchers w
      JOIN users u ON w.email = u.email
      WHERE w.active = true AND u.tier = 'free' AND u.amnesty = false
    `;
  }
  return sql`SELECT * FROM watchers WHERE active = true`;
}

export async function deactivateWatcher(unsubscribeToken: string) {
  const sql = getDb();
  await sql`UPDATE watchers SET active = false WHERE unsubscribe_token = ${unsubscribeToken}`;
}

export async function upsertAvailability(routeId: string, date: string, priceCents: number | null) {
  const sql = getDb();
  await sql`
    INSERT INTO availability_cache (route_id, available_date, price_cents, checked_at)
    VALUES (${routeId}, ${date}, ${priceCents}, NOW())
    ON CONFLICT (route_id, available_date)
    DO UPDATE SET price_cents = ${priceCents}, checked_at = NOW()
  `;
}

export async function getAvailability(routeId: string) {
  const sql = getDb();
  return sql`
    SELECT available_date, price_cents, checked_at
    FROM availability_cache
    WHERE route_id = ${routeId} AND checked_at > NOW() - INTERVAL '2 hours'
    ORDER BY available_date
  `;
}

export async function hasNotificationBeenSent(watcherId: number, date: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT 1 FROM notifications_sent WHERE watcher_id = ${watcherId} AND available_date = ${date}
  `;
  return rows.length > 0;
}

export async function recordNotification(watcherId: number, date: string) {
  const sql = getDb();
  await sql`
    INSERT INTO notifications_sent (watcher_id, available_date)
    VALUES (${watcherId}, ${date})
    ON CONFLICT (watcher_id, available_date) DO NOTHING
  `;
}

export async function getUserByEmail(email: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT id, email, tier, amnesty FROM users WHERE email = ${email} LIMIT 1
  `;
  return rows[0] || null;
}
