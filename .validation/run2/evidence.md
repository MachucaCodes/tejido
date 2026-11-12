**Browser check — Admin: sessions list at /admin, New session on its own page: PASSED** (4/4 checks, 12/12 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `3dcc3331da` on `clock-cf251da5-ui-mockup-home-does-two-big-jobs-create`
- Environment: next start of this branch, prod Supabase, read-only — http://127.0.0.1:4187, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T05:56:28.391Z (16s)

**Steps**

1. ✅ Open /admin (1108 ms)
2. ✅ **Check:** Page shows "New session" (26 ms)
3. ✅ Screenshot (0 ms)
4. ✅ Click "New session" (32 ms)
5. ✅ **Check:** Page shows "Or fill in the form yourself" (11 ms)
6. ✅ Screenshot (0 ms)
7. ✅ Click "Or fill in the form yourself" (79 ms)
8. ✅ Screenshot (0 ms)
9. ✅ Open /admin/sessions (1350 ms)
10. ✅ **Check:** URL matches /admin$ (0 ms)
11. ✅ **Check:** Page shows "New session" (36 ms)
12. ✅ Screenshot (0 ms)

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
