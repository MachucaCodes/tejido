**Browser check — Admin UI fixes at 1440: FAILED** (5/18 checks, 15/47 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `9501a090ca` on `clock-abe489d2-ui-fix-lists-index-stacks-a-create-list` (with uncommitted changes)
- Environment: PR #8 preview, production Supabase, signed in as Dane (admin), read-only clicks — https://tejido-git-clock-abe489d2-ui-fix-lis-1c9b44-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:15:38.296Z (62.6s)

**Steps**

1. ✅ Open /admin/lists (3416 ms)
2. ✅ **Check:** Page shows "New list" (47 ms)
3. ✅ **Check:** Page does not show "Named groups of phone numbers" (3051 ms)
4. ✅ lists index (0 ms)
5. ✅ Click "New list" (76 ms)
6. ✅ **Check:** `#new-list-name` is visible (13 ms)
7. ✅ new list dialog (0 ms)
8. ✅ Press Escape (11 ms)
9. ✅ Open /admin/sessions/evolving-why-statement/logs (6528 ms)
10. ✅ **Check:** Page shows "matching calls" (3337 ms)
11. ✅ **Check:** Page does not show "stream_aborted" (6192 ms)
12. ✅ logs populated (0 ms)
13. ✅ Click "Filter" (2834 ms)
14. ✅ Wait 400 ms (455 ms)
15. ✅ logs filter menu open (0 ms)
16. ❌ Click "Facilitator" (10050 ms)
   - locator.click: Timeout 10000ms exceeded.
17. ⏭️ **Check:** URL matches kind=facilitator_turn
18. ⏭️ logs with kind chip
19. ⏭️ Click `[aria-label='Remove filter Facilitator']`
20. ⏭️ **Check:** chip removes the filter
21. ⏭️ Open /admin/sessions/why-statement-v2/logs
22. ⏭️ **Check:** Page shows "0 of 0 matching calls"
23. ⏭️ **Check:** Page does not show "Filter"
24. ⏭️ logs empty session
25. ⏭️ Open /admin/sessions/daily-life-together
26. ⏭️ **Check:** Page shows "Privacy:"
27. ⏭️ **Check:** Page does not show "connect_consent_at"
28. ⏭️ overview privacy row
29. ⏭️ Click "Make anonymous"
30. ⏭️ **Check:** Page shows "Make this session anonymous?"
31. ⏭️ privacy confirm dialog
32. ⏭️ Click "Cancel"
33. ⏭️ **Check:** Page does not show "Make this session anonymous?"
34. ⏭️ **Check:** Page shows "Connect"
35. ⏭️ Open /admin/sessions/evolving-why-statement/synthesis
36. ⏭️ **Check:** Page shows "Find sources"
37. ⏭️ synthesis
38. ⏭️ Open /admin
39. ⏭️ **Check:** no language switch on admin
40. ⏭️ Click "Or fill in the form yourself"
41. ⏭️ **Check:** Page shows "Summary focus"
42. ⏭️ admin home with manual form
43. ⏭️ Open /admin/sessions
44. ⏭️ sessions list
45. ⏭️ Open /admin/does-not-exist
46. ⏭️ **Check:** Page shows "Back to sessions"
47. ⏭️ admin 404

**What this does not show**

- Nothing saved: privacy confirm is cancelled, Rebuild and Create are not clicked
- Session load error state not reproducible on a working DB
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
