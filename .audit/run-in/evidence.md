**Browser check — Admin home, nav, new session (look only): FAILED** (0/2 checks, 3/19 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `c4eac4d2be` on `clock-19c06f01-ui-audit-cold-audit-of-the-admin-home` (with uncommitted changes)
- Environment: production, read-only look — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:45:11.981Z (19.6s)

**Steps**

1. ✅ Open /admin (2125 ms)
2. ✅ Wait 1500 ms (1504 ms)
3. ✅ admin home first screen (0 ms)
4. ❌ **Check:** row count (probe) (10070 ms)
   - got 10
5. ⏭️ **Check:** page height (probe)
6. ⏭️ Wait 600 ms
7. ⏭️ admin home bottom
8. ⏭️ Open /admin/new
9. ⏭️ Wait 1500 ms
10. ⏭️ new session page
11. ⏭️ Click "Or fill in the form yourself"
12. ⏭️ Wait 600 ms
13. ⏭️ manual form open
14. ⏭️ Open /admin/lists
15. ⏭️ Wait 1500 ms
16. ⏭️ lists index
17. ⏭️ Open /admin/nope-audit
18. ⏭️ Wait 1500 ms
19. ⏭️ admin 404

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
