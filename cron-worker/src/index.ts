// Dedicated cron Worker for Eurosnap.
//
// Cloudflare Cron Triggers fire scheduled() on this tiny Worker, which makes an
// authenticated request to the main app's check endpoints. Decoupled from the
// OpenNext app worker so the app build stays untouched. Replaces cron-job.org.
//
// TARGET_URL is a plain var (swap to https://eurosnap.app at cutover).
// CRON_SECRET is a secret (set via `wrangler secret put`).
//
// Schedules (see wrangler.jsonc):
//   */5 * * * *  -> /api/check       (pro + amnesty, every 5 min)
//   0   * * * *  -> /api/check-free   (free tier, hourly)

interface Env {
  TARGET_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(event: { cron: string }, env: Env): Promise<void> {
    const path = event.cron === "0 * * * *" ? "/api/check-free" : "/api/check";
    const url = `${env.TARGET_URL}${path}`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      });
      const body = await res.text();
      console.log(`[cron] ${event.cron} -> ${url} : ${res.status} ${body.slice(0, 200)}`);
    } catch (err) {
      console.error(`[cron] ${event.cron} -> ${url} FAILED:`, err);
    }
  },
};
