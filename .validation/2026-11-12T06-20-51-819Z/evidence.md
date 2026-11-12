**Browser check — Admin UI fixes at 1440: FAILED** (13/18 checks, 33/47 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `50d27e6d8c` on `clock-abe489d2-ui-fix-lists-index-stacks-a-create-list` (with uncommitted changes)
- Environment: PR #8 preview, production Supabase, signed in as Dane (admin), read-only clicks — https://tejido-git-clock-abe489d2-ui-fix-lis-1c9b44-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:20:53.395Z (95s)

**Steps**

1. ✅ Open /admin/lists (1506 ms)
2. ✅ **Check:** Page shows "New list" (38 ms)
3. ✅ **Check:** Page does not show "Named groups of phone numbers" (3059 ms)
4. ✅ lists index (0 ms)
5. ✅ Click "New list" (54 ms)
6. ✅ **Check:** `#new-list-name` is visible (4 ms)
7. ✅ new list dialog (0 ms)
8. ✅ Press Escape (12 ms)
9. ✅ Open /admin/sessions/evolving-why-statement/logs (5896 ms)
10. ✅ **Check:** Page shows "matching calls" (2605 ms)
11. ✅ **Check:** Page does not show "stream_aborted" (5805 ms)
12. ✅ logs populated (0 ms)
13. ✅ Click "Filter" (2992 ms)
14. ✅ Wait 400 ms (455 ms)
15. ✅ logs filter menu open (0 ms)
16. ✅ Click `[role=menuitemradio]:has-text('Facilitator')` (148 ms)
17. ✅ **Check:** URL matches kind=facilitator_turn (4059 ms)
18. ✅ logs with kind chip (0 ms)
19. ✅ Click `[aria-label='Remove filter Facilitator']` (102 ms)
20. ✅ **Check:** chip removes the filter (3271 ms)
21. ✅ Open /admin/sessions/why-statement-v2/logs (905 ms)
22. ✅ **Check:** Page shows "0 of 0 matching calls" (17 ms)
23. ✅ **Check:** no Filter button on an empty session (8 ms)
24. ✅ logs empty session (0 ms)
25. ✅ Open /admin/sessions/daily-life-together (1247 ms)
26. ✅ **Check:** Page shows "Privacy:" (31 ms)
27. ✅ **Check:** Page does not show "connect_consent_at" (3066 ms)
28. ✅ overview privacy row (0 ms)
29. ✅ Click "Make anonymous" (64 ms)
30. ✅ **Check:** Page shows "Make this session anonymous?" (13 ms)
31. ✅ privacy confirm dialog (0 ms)
32. ✅ Click "Cancel" (70 ms)
33. ✅ **Check:** Page does not show "Make this session anonymous?" (3069 ms)
34. ❌ **Check:** Page shows "Connect" (10005 ms)
   - locator.waitFor: Timeout 10000ms exceeded.
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
