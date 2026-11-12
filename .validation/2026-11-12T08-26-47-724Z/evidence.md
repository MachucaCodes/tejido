**Browser check — Before: create error on production: PASSED** (1/1 checks, 7/7 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `5999778a2e` on `clock-c04d863f-ui-fix-explanations-sit-on-the-page` (with uncommitted changes)
- Environment: main deployment (same code as production), one refused Create (link name exists), nothing written — https://tejido-aul7afi0z-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:26:49.140Z (10.2s)

**Steps**

1. ✅ Open /admin/new (2431 ms)
2. ✅ Click "Or fill in the form yourself" (59 ms)
3. ✅ Type "esm-rental-policy" into `#slug` (31 ms)
4. ✅ Type "(test) Is this link name free?" into `#q` (22 ms)
5. ✅ Click `form:has(#slug) button[type=submit]` (52 ms)
6. ✅ **Check:** Page shows "code already taken" (790 ms)
7. ✅ Before: database words, away from the field (0 ms)

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
