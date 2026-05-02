// Single source of truth for "should this user get instant alerts?"
//
// Pro users + the 241 amnesty users (signed up before AMNESTY_CUTOFF) get
// instant. New free users (post-cutoff) get the 30-min queued path.
//
// The 30-min figure is a product knob — change DELAY_MS to retune.
// The cutoff is hardcoded — see AMNESTY.md.

export const AMNESTY_CUTOFF = new Date("2026-04-18T11:00:00Z");

export const FREE_TIER_DELAY_MS = 30 * 60 * 1000;

export type AccessUser = {
  tier?: string | null;
  amnesty?: boolean | null;
};

export function hasInstantAccess(user: AccessUser | null | undefined): boolean {
  if (!user) return false;
  return user.tier === "pro" || user.amnesty === true;
}
