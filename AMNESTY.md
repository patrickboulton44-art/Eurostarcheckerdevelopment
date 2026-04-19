# Amnesty Policy — READ THIS BEFORE TOUCHING ANY FREE/PRO CODE

## The rule

**241 users who signed up before 2026-04-18 11:00:00 UTC keep the original product experience permanently.** Any new feature that creates a difference between free and pro users (delays, restrictions, expiry, etc.) must NOT apply to them.

This is a permanent commitment, not a trial period.

## Why

- Existing users signed up under the original terms (instant alerts, no expiry, full free access)
- Retroactively degrading their experience would be:
  - Ethically bad (broken promise)
  - Legally risky (UK consumer law treats unilateral changes harshly)
  - Bad for trust and reputation

## How it works

### Database
Every user has an `amnesty BOOLEAN` column in `users` table:
- `true` for the 241 grandfathered users
- `false` for everyone signing up after the cutoff
- Default for new rows: `false`

### Code
**Always use the `hasInstantAccess()` helper.** Never check `user.tier === 'pro'` directly.

```ts
// src/lib/access.ts
export function hasInstantAccess(user: User): boolean {
  return user.tier === 'pro' || user.amnesty === true;
}
```

```ts
// In API routes, scrapers, anywhere with free/pro logic:
if (hasInstantAccess(user)) {
  // Pro users + amnesty users — full/instant experience
} else {
  // New free users only — restricted experience
}
```

### Cutoff (immutable)
```ts
export const AMNESTY_CUTOFF = new Date('2026-04-18T11:00:00Z');
```

This is hardcoded. Any change requires a code commit visible in git history.

## The golden rule

**NEVER write `if (user.tier === 'pro')` anywhere.** Always go through `hasInstantAccess(user)`.

If you find a direct tier check, refactor it. If you're adding a new feature, use the helper.

## Backups & verification

### Source of truth
- **Database:** `users.amnesty` column in Neon Postgres
- **Backup CSV:** `/Users/patrickboulton/Library/CloudStorage/GoogleDrive-patrickboulton44@gmail.com/My Drive/Eurosnap/Brevo Contacts/brevo-contacts-merged.csv` (242 lines = 1 header + 241 contacts)
- **Local backup:** `~/Downloads/brevo-contacts-merged.csv`

### How to verify amnesty is intact
```sql
SELECT COUNT(*) FROM users WHERE amnesty = true;
-- Should return 241+ (only ever grows if old users are recovered, never shrinks)
```

### When adding new users (e.g. recovering a deleted account)
- If they signed up before the cutoff → set `amnesty = true`
- Add their email to the CSV backup

## Process for any new free/pro feature

1. **Build it in the dev repo first** (this repo)
2. **Use `hasInstantAccess()` everywhere** — no direct tier checks
3. **Test:** verify amnesty users get the full experience
4. **Audit before merge to prod:** confirm no amnesty user is degraded
5. **After deploy:** check the audit query (count of delayed amnesty users = 0)

## If you (Claude) lose context

This file IS the rulebook. If you find this file in any future session:
1. The 241 amnesty users are sacred — never break their experience
2. Use `hasInstantAccess()` for all tier checks
3. The CSV backup is in Google Drive at the path above
4. The DB column `users.amnesty` is the live source of truth

There is also a memory file at `~/.claude/projects/-Users-patrickboulton/memory/eurosnap-amnesty.md` with the same rules.

## Owner

Patrick Boulton (patrickboulton44@gmail.com) is the human owner.
Claude (the AI) is responsible for maintaining the technical safeguards every time code is changed.

---

**Last updated:** 2026-04-18
**Amnesty count:** 241
**Cutoff timestamp:** 2026-04-18 11:00:00 UTC
