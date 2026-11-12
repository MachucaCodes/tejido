**Browser check — After deploy: admin UI fixes on production: FAILED** (1/13 checks, 4/34 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `788043366b` on `clock-b05f7733-ui-fix-list-page-has-a-lists-back-link` (with uncommitted changes)
- Environment: Production after merging PR #14, read-only (nothing saved or sent) — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), 1440×900, on clock-fsn1
- Ran: 2026-11-12T07:42:33.115Z (21.4s)

**Steps**

1. ✅ Open /admin (1194 ms)
2. ✅ **Check:** Page shows "New session" (30 ms)
3. ✅ Sessions home: filled New session, rows with gap, archived row (0 ms)
4. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (1059 ms)
5. ❌ **Check:** Page shows "Members" (10009 ms)
   - locator.waitFor: Timeout 10000ms exceeded. (stopped at the app's sign-in page: no login for this address on this machine (see "Signing in on previews" in clock-validate help))
6. ⏭️ **Check:** Page does not show "← Lists"
7. ⏭️ List page: no back link under the Lists tab
8. ⏭️ Click "Edit"
9. ⏭️ **Check:** Page shows "Edit list"
10. ⏭️ Edit list: footer with trash left, Cancel + Save right
11. ⏭️ Press Escape
12. ⏭️ Click "Add numbers"
13. ⏭️ **Check:** Page shows "Add to list"
14. ⏭️ Add numbers: footer with Cancel + Add to list right
15. ⏭️ Press Escape
16. ⏭️ Open /admin/lists
17. ⏭️ Lists index: filled New list
18. ⏭️ Open /admin/new
19. ⏭️ **Check:** Page shows "New session"
20. ⏭️ **Check:** Page does not show "← Sessions"
21. ⏭️ New session: no back link
22. ⏭️ Open /admin/sessions/esm-rental-policy/logs
23. ⏭️ **Check:** Page shows "matching calls"
24. ⏭️ **Check:** log rows end with a Voice N label
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
