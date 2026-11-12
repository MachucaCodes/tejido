**Browser check — Session pages: steady header, themes, Edit labels: PASSED** (12/12 checks, 24/24 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `5999778a2e` on `clock-c04d863f-ui-fix-explanations-sit-on-the-page` (with uncommitted changes)
- Environment: PR #15 Vercel preview, production database, read-only (nothing saved) — https://tejido-git-clock-c04d863f-ui-fix-exp-435661-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:23:32.951Z (39.8s)

**Steps**

1. ✅ Open /admin/sessions/esm-rental-policy (3761 ms)
2. ✅ **Check:** Page shows "Themes" (31 ms)
3. ✅ Overview: themes with points, empty ones folded (0 ms)
4. ✅ **Check:** note the tab row position (21 ms)
5. ✅ Click "empty themes" (36 ms)
6. ✅ Empty themes opened, dimmed (0 ms)
7. ✅ Click "Synthesis" (27 ms)
8. ✅ **Check:** URL matches /synthesis (0 ms)
9. ✅ Wait 1500 ms (1513 ms)
10. ✅ **Check:** tabs at the same height on Synthesis (2 ms)
11. ✅ Synthesis (0 ms)
12. ✅ Click "Logs" (32 ms)
13. ✅ **Check:** URL matches /logs (941 ms)
14. ✅ Wait 1500 ms (1512 ms)
15. ✅ **Check:** tabs at the same height on Logs (7 ms)
16. ✅ Logs (0 ms)
17. ✅ Click "Settings" (239 ms)
18. ✅ **Check:** URL matches /settings (0 ms)
19. ✅ **Check:** Page shows "Question people are asked" (18 ms)
20. ✅ **Check:** tabs at the same height on Settings (3 ms)
21. ✅ **Check:** Page shows "Summary focus" (19 ms)
22. ✅ **Check:** Page shows "Link name" (18 ms)
23. ✅ **Check:** Page does not show "Auto-translated after you save" (3062 ms)
24. ✅ Settings: Edit form with the create form's labels (0 ms)

**What this does not show**

- Read-only: Save changes not clicked
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
