**Browser check — Start a session: front door to New session: PASSED** (3/3 checks, 15/15 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `fa2062dfcf` on `clock-275983d2-ui-audit-walk-start-a-session-as-an` (with uncommitted changes)
- Environment: production, signed in as Dane, look only — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-13T19:04:39.173Z (26.6s)

**Steps**

1. ✅ Open / (3283 ms)
2. ✅ Wait 1500 ms (1503 ms)
3. ✅ 1 home (0 ms)
4. ✅ Click `header a[href='/me']` (52 ms)
5. ✅ **Check:** URL matches /me (607 ms)
6. ✅ Wait 1500 ms (1502 ms)
7. ✅ 2 profile (0 ms)
8. ✅ Click `main a[href='/admin']` (15 ms)
9. ✅ **Check:** URL matches /admin (0 ms)
10. ✅ Wait 1500 ms (1502 ms)
11. ✅ 3 admin sessions (0 ms)
12. ✅ Click "New session" (33 ms)
13. ✅ **Check:** URL matches /admin/new (0 ms)
14. ✅ Wait 1500 ms (1502 ms)
15. ✅ 4 new session (0 ms)

**What this does not show**

- Look only: nothing saved
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
