**Browser check — List page: members first, add numbers in a dialog: PASSED** (4/4 checks, 12/12 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `68553791a0` on `clock-02d9bcf8-ui-mockup-list-page-opens-on-a-big-add` (with uncommitted changes)
- Environment: PR preview, production Supabase, read-only (nothing added) — https://tejido-git-clock-02d9bcf8-ui-mockup-e5f195-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:01:32.174Z (24.5s)

**Steps**

1. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (3055 ms)
2. ✅ **Check:** Page shows "Members" (38 ms)
3. ✅ **Check:** Page does not show "Or paste numbers" (3079 ms)
4. ✅ List page opens on Members (0 ms)
5. ✅ Click "Add numbers" (74 ms)
6. ✅ **Check:** Page shows "Or paste numbers" (6 ms)
7. ✅ Add numbers dialog (0 ms)
8. ✅ Click `[aria-label='How to paste numbers']` (74 ms)
9. ✅ Wait 600 ms (607 ms)
10. ✅ Paste help behind the info icon (0 ms)
11. ✅ Press Escape (21 ms)
12. ✅ **Check:** Page does not show "Or paste numbers" (3045 ms)

**What this does not show**

- Does not add any number (production data)
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
