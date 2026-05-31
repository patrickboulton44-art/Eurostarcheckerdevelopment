import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

/**
 * D1 access layer.
 *
 * Provides a `sql` tagged-template that mimics the @neondatabase/serverless
 * interface (`await sql`SELECT ...`` resolves to a rows array), so the ported
 * query functions in db.ts / auth.ts read almost identically to the Postgres
 * originals. Under the hood it compiles to a D1 prepared statement.
 *
 * Differences callers must respect (SQLite, not Postgres):
 *   - booleans are stored as INTEGER 0/1 (this shim coerces bound booleans)
 *   - use datetime('now') / datetime('now','-2 hours') instead of NOW()/INTERVAL
 *   - no `= ANY(...)`, no `::int` casts, no `ADD COLUMN IF NOT EXISTS`
 */

type Bindable = string | number | boolean | null | undefined;

export function getD1(): D1Database {
  const { env } = getCloudflareContext();
  const db = (env as { DB?: D1Database }).DB;
  if (!db) {
    throw new Error("D1 binding 'DB' is not available on the Cloudflare context");
  }
  return db;
}

/**
 * Tagged template: sql`SELECT * FROM users WHERE email = ${email}`
 * Interpolated values become positional `?` bindings (no string injection).
 * Resolves to the rows array (D1 result.results), matching neon's behaviour.
 */
export async function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: Bindable[]
): Promise<T[]> {
  const query = strings.join("?");
  const bound = values.map((v) => (typeof v === "boolean" ? (v ? 1 : 0) : v ?? null));
  const db = getD1();
  const { results } = await db.prepare(query).bind(...bound).all<T>();
  return results ?? [];
}
