**Browser check — List page: members first, add numbers in a dialog: PASSED** (4/4 checks, 12/12 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `da2c2519e6` on `clock-02d9bcf8-ui-mockup-list-page-opens-on-a-big-add` (with uncommitted changes)
- Environment: next start of this branch, production Supabase, read-only (nothing added) — http://127.0.0.1:4173, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T05:56:14.897Z (22.5s)

**Steps**

1. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (1342 ms)
2. ✅ **Check:** Page shows "Members" (18 ms)
3. ✅ **Check:** Page does not show "Or paste numbers" (3030 ms)
4. ✅ List page opens on Members (0 ms)
5. ✅ Click "Add numbers" (56 ms)
6. ✅ **Check:** Page shows "Or paste numbers" (4 ms)
7. ✅ Add numbers dialog (0 ms)
8. ✅ Click `[aria-label='How to paste numbers']` (92 ms)
9. ✅ Wait 600 ms (607 ms)
10. ✅ Paste help behind the info icon (0 ms)
11. ✅ Press Escape (16 ms)
12. ✅ **Check:** Page does not show "Or paste numbers" (3047 ms)

**What this does not show**

- Does not add any number (production data)
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
