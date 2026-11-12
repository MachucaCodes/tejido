**Browser check — Lists load failure shows an error (simulated locally): PASSED** (5/5 checks, 9/9 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `da86f18f1f` on `clock-df16d974-lists-load-error` (with uncommitted changes)
- Environment: local build of the fix with the lists/list_members table names changed in an uncommitted edit to force a query error; real DB read-only — http://localhost:4173, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T05:05:01.050Z (21.1s)

**Steps**

1. ✅ Open /admin/lists (1381 ms)
2. ✅ **Check:** Page shows "Couldn't load lists" (29 ms)
3. ✅ **Check:** Page does not show "No lists yet." (3055 ms)
4. ✅ lists page, load failed (0 ms)
5. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (1926 ms)
6. ✅ **Check:** Page shows "Couldn't load the numbers in this list" (51 ms)
7. ✅ **Check:** Page does not show "No numbers yet." (3058 ms)
8. ✅ **Check:** Page does not show "0 numbers" (3052 ms)
9. ✅ list detail, members load failed (0 ms)

**What this does not show**

- Failure forced by a local-only table-name change, not a real outage
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
