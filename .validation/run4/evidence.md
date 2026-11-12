**Browser check — Admin: sessions list at /admin, New session on its own page: PASSED** (4/4 checks, 12/12 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `2eb78f636e` on `clock-cf251da5-ui-mockup-home-does-two-big-jobs-create`
- Environment: production after merge of #6, look only — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:22:20.639Z (16.6s)

**Steps**

1. ✅ Open /admin (1560 ms)
2. ✅ **Check:** Page shows "New session" (39 ms)
3. ✅ Screenshot (0 ms)
4. ✅ Click "New session" (62 ms)
5. ✅ **Check:** Page shows "Or fill in the form yourself" (1312 ms)
6. ✅ Screenshot (0 ms)
7. ✅ Click "Or fill in the form yourself" (47 ms)
8. ✅ Screenshot (0 ms)
9. ✅ Open /admin/sessions (1152 ms)
10. ✅ **Check:** URL matches /admin$ (0 ms)
11. ✅ **Check:** Page shows "New session" (16 ms)
12. ✅ Screenshot (0 ms)

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
