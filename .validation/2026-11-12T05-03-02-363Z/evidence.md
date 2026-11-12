**Browser check — Admin home archived split, admin 404, member menu: PASSED** (10/10 checks, 22/22 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `3315ac872e` on `clock-df16d974-ui-fix-admin-home-lists-archived`
- Environment: production after merge — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T05:03:04.109Z (30.9s)

**Steps**

1. ✅ Open /admin (2309 ms)
2. ✅ **Check:** Page shows "All sessions" (28 ms)
3. ✅ **Check:** archived session is in its own group (5 ms)
4. ✅ **Check:** Page shows "archived" (13 ms)
5. ✅ admin home, archived apart and dimmed (0 ms)
6. ✅ Open /admin/sessions/zz-no-such-session (829 ms)
7. ✅ **Check:** Page shows "Back to sessions" (17 ms)
8. ✅ **Check:** admin nav is shown (14 ms)
9. ✅ admin 404 inside admin layout (0 ms)
10. ✅ Click "Back to sessions" (65 ms)
11. ✅ **Check:** URL matches /admin$ (0 ms)
12. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (1380 ms)
13. ✅ **Check:** no top-level Remove on rows (3086 ms)
14. ✅ member rows with … menu (0 ms)
15. ✅ Click `[aria-label='Member actions']` (42 ms)
16. ✅ **Check:** Page shows "Remove from list" (7 ms)
17. ✅ menu open (0 ms)
18. ✅ Click "Remove from list" (32 ms)
19. ✅ **Check:** Page shows "Click again to remove" (5 ms)
20. ✅ confirm step (0 ms)
21. ✅ Press Escape (22 ms)
22. ✅ **Check:** Page does not show "Click again to remove" (3062 ms)

**What this does not show**

- Member removal is opened to its confirm step but not run, so no real member is removed
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
