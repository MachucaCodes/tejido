**Browser check — Admin UI fixes on the PR preview: FAILED** (8/13 checks, 23/34 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `14f93c37e6` on `clock-b05f7733-ui-fix-list-page-has-a-lists-back-link` (with uncommitted changes)
- Environment: PR #14 Vercel preview, production Supabase, read-only (no saves, no sends) — https://tejido-git-clock-b05f7733-ui-fix-lis-6fe2f9-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T07:28:17.366Z (54.8s)

**Steps**

1. ✅ Open /admin (3079 ms)
2. ✅ **Check:** Page shows "New session" (24 ms)
3. ✅ Sessions home: filled New session, rows with gap, archived row (0 ms)
4. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (792 ms)
5. ✅ **Check:** Page shows "Members" (13 ms)
6. ✅ **Check:** Page does not show "← Lists" (3028 ms)
7. ✅ List page: no back link under the Lists tab (0 ms)
8. ✅ Click "Edit" (41 ms)
9. ✅ **Check:** Page shows "Edit list" (7 ms)
10. ✅ Edit list: footer with trash left, Cancel + Save right (0 ms)
11. ✅ Press Escape (22 ms)
12. ✅ Click "Add numbers" (32 ms)
13. ✅ **Check:** Page shows "Add to list" (4 ms)
14. ✅ Add numbers: footer with Cancel + Add to list right (0 ms)
15. ✅ Press Escape (9 ms)
16. ✅ Open /admin/lists (850 ms)
17. ✅ Lists index: filled New list (0 ms)
18. ✅ Open /admin/new (1700 ms)
19. ✅ **Check:** Page shows "New session" (29 ms)
20. ✅ **Check:** Page does not show "← Sessions" (3043 ms)
21. ✅ New session: no back link (0 ms)
22. ✅ Open /admin/sessions/esm-rental-policy/logs (1761 ms)
23. ✅ **Check:** Page shows "matching calls" (224 ms)
24. ❌ **Check:** Page shows "Voice" (10014 ms)
   - locator.waitFor: Timeout 10000ms exceeded.
25. ⏭️ Logs: rows end with Voice N
26. ⏭️ Open /admin/sessions/daily-life-together/logs
27. ⏭️ **Check:** Page shows "No AI calls yet"
28. ⏭️ **Check:** Page does not show "0 of 0"
29. ⏭️ Empty logs: only the empty card
30. ⏭️ Open /me
31. ⏭️ **Check:** Page shows "Manage your sessions"
32. ⏭️ /me: Manage your sessions link
33. ⏭️ Click "Manage your sessions"
34. ⏭️ **Check:** URL matches /admin

**What this does not show**

- Failed-load paths can't be forced on the preview; checked locally
- Empty sessions home not shown: the account has sessions
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
