**Browser check — Admin home archived group (scrolled): PASSED** (1/1 checks, 5/5 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `3315ac872e` on `clock-df16d974-ui-fix-admin-home-lists-archived`
- Environment: local next start of this branch, prod Supabase, read-only — http://localhost:4173, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T05:01:29.541Z (8.3s)

**Steps**

1. ✅ Open /admin (1961 ms)
2. ✅ **Check:** Page shows "Archived (1)" (44 ms)
3. ✅ Press End (7 ms)
4. ✅ Wait 800 ms (805 ms)
5. ✅ bottom of admin home (0 ms)

**What this does not show**

- Member removal is opened to its confirm step but not run, so no real member is removed
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
