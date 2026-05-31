-- Eurosnap D1 (SQLite) schema — ported from the Postgres initDb().
-- Dialect notes vs Postgres:
--   SERIAL              -> INTEGER PRIMARY KEY AUTOINCREMENT
--   BOOLEAN (true/false)-> INTEGER (1/0)
--   TIMESTAMPTZ/NOW()   -> TEXT DEFAULT (datetime('now'))  [UTC 'YYYY-MM-DD HH:MM:SS']
--   DATE                -> TEXT 'YYYY-MM-DD'
--   INT                 -> INTEGER
-- Apply with:
--   wrangler d1 execute eurosnap --local  --file=db/schema.sql   (local dev sqlite)
--   wrangler d1 execute eurosnap --remote --file=db/schema.sql   (live D1)

CREATE TABLE IF NOT EXISTS users (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  email                   TEXT NOT NULL UNIQUE,
  name                    TEXT NOT NULL DEFAULT '',
  password_hash           TEXT,
  google_id               TEXT,
  tier                    TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  amnesty                 INTEGER NOT NULL DEFAULT 0,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS watchers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  email             TEXT NOT NULL,
  route_id          TEXT NOT NULL,
  date_from         TEXT NOT NULL,
  date_to           TEXT NOT NULL,
  passengers        INTEGER NOT NULL DEFAULT 1,
  active            INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribe_token TEXT NOT NULL,
  weekdays          TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
  time_slot_pref    TEXT NOT NULL DEFAULT 'any',
  UNIQUE(email, route_id, date_from, date_to)
);

CREATE TABLE IF NOT EXISTS availability_cache (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id       TEXT NOT NULL,
  available_date TEXT NOT NULL,
  price_cents    INTEGER,
  checked_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(route_id, available_date)
);

CREATE TABLE IF NOT EXISTS notifications_sent (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  watcher_id     INTEGER NOT NULL REFERENCES watchers(id),
  available_date TEXT NOT NULL,
  sent_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(watcher_id, available_date)
);

CREATE INDEX IF NOT EXISTS idx_watchers_active ON watchers (active);
CREATE INDEX IF NOT EXISTS idx_avail_route ON availability_cache (route_id);
