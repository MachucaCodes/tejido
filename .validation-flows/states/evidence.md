**Browser check — List states: PASSED** (2/2 checks, 12/12 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `a0ba74c90b` on `clock-adf3df2a-ui-audit-cold-audit-of-the-lists-part` (with uncommitted changes)
- Environment: production, read-only — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T03:49:11.590Z (20.3s)

**Steps**

1. ✅ Open /admin/lists/00000000-0000-0000-0000-000000000000 (1555 ms)
2. ✅ Wait 800 ms (803 ms)
3. ✅ missing list (0 ms)
4. ✅ Open /admin/lists/not-a-list (1104 ms)
5. ✅ Wait 800 ms (804 ms)
6. ✅ bad id (0 ms)
7. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (1364 ms)
8. ✅ **Check:** Page shows "Members" (37 ms)
9. ✅ Type "zzqxw" into `#person-search` (32 ms)
10. ✅ Wait 1500 ms (1507 ms)
11. ✅ **Check:** hide header name (6 ms)
12. ✅ search no match (0 ms)

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
