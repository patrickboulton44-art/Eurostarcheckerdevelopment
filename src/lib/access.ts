// Single source of truth for "should this user get instant alerts?"
//
// Pro users + amnesty users (signed up before AMNESTY_CUTOFF) get instant
// (handled by /api/check, every 5 min). Everyone else is handled by
// /api/check-free, every 90 min.

export const AMNESTY_CUTOFF = new Date("2026-04-18T11:00:00Z");

export type AccessUser = {
  tier?: string | null;
  amnesty?: boolean | null;
};

export function hasInstantAccess(user: AccessUser | null | undefined): boolean {
  if (!user) return false;
  return user.tier === "pro" || user.amnesty === true;
}
