**Browser check — Measure: home, sessions hover: FAILED** (1/2 checks, 8/9 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `fa2062dfcf` on `clock-275983d2-ui-audit-walk-start-a-session-as-an` (with uncommitted changes)
- Environment: production, signed in as Dane, look only — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-13T19:10:21.470Z (25.8s)

**Steps**

1. ✅ Open / (1631 ms)
2. ✅ Wait 1500 ms (1504 ms)
3. ✅ Home (0 ms)
4. ✅ Click `header a[href='/me']` (22 ms)
5. ✅ Wait 1500 ms (1502 ms)
6. ✅ Click `main a[href='/admin']` (19 ms)
7. ✅ **Check:** URL matches /admin (0 ms)
8. ✅ Wait 1500 ms (1502 ms)
9. ❌ **Check:** hover colours (prints) (10172 ms)
   - got "lab(50.1952 38.9085 37.0691) | lab(39.9367 -4.76244 6.47206) | hover=true"

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
