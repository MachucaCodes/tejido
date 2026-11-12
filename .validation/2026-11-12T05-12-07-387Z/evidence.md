**Browser check — PR3: archive confirm, session layout, logs kinds/paging, dates, list delete, language, wording: FAILED** (12/24 checks, 21/54 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `17af2870eb` on `clock-df16d974-archive-confirm-log-kinds` (with uncommitted changes)
- Environment: local next start of this branch, prod Supabase, read-only — http://localhost:4173, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T05:12:08.767Z (52s)

**Steps**

1. ✅ Open /admin (2357 ms)
2. ✅ **Check:** Page shows "Home" (41 ms)
3. ✅ **Check:** Page does not show "Your questions" (3065 ms)
4. ✅ Click "Or fill in the form yourself" (60 ms)
5. ✅ **Check:** Page shows "Link name" (8 ms)
6. ✅ **Check:** Page shows "The question people are asked." (21 ms)
7. ✅ home: Home nav, manual form labels (0 ms)
8. ✅ Open /admin/sessions/evolving-why-statement (1976 ms)
9. ✅ **Check:** `h1` is visible (27 ms)
10. ✅ **Check:** Page shows "CST" (18 ms)
11. ✅ **Check:** Page shows "points" (27 ms)
12. ✅ **Check:** Page does not show "Archive session" (3085 ms)
13. ✅ session page: topic h1, results first, archive icon in header (0 ms)
14. ✅ Click `[aria-label='Archive session']` (105 ms)
15. ✅ **Check:** Page shows "Nothing is deleted" (16 ms)
16. ✅ archive confirm (1 ms)
17. ✅ Click "Cancel" (64 ms)
18. ✅ **Check:** Page does not show "Nothing is deleted" (3087 ms)
19. ✅ Open /admin/sessions/evolving-why-statement/logs (6602 ms)
20. ✅ **Check:** Page shows "analyze" (2774 ms)
21. ✅ **Check:** Page shows "summary" (2968 ms)
22. ❌ **Check:** Page does not show "cluster" (6245 ms)
   - "cluster" is on the page
23. ⏭️ **Check:** Page shows "Showing 200 of 522 matching calls"
24. ⏭️ logs: real kinds and totals
25. ⏭️ Press End
26. ⏭️ Wait 500 ms
27. ⏭️ logs: Older link
28. ⏭️ Click "Older →"
29. ⏭️ **Check:** Page shows "older page"
30. ⏭️ **Check:** Page shows "← Newest"
31. ⏭️ logs: older page
32. ⏭️ Click `a[href$='/logs?kind=summarize_session']`
33. ⏭️ **Check:** URL matches kind=summarize_session
34. ⏭️ logs: summary filter
35. ⏭️ Open /admin/sessions/evolving-why-statement/synthesis
36. ⏭️ **Check:** Page shows "CST"
37. ⏭️ synthesis times with zone
38. ⏭️ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb
39. ⏭️ **Check:** Page shows "(auto)"
40. ⏭️ **Check:** Page does not show "Click again to delete"
41. ⏭️ Press End
42. ⏭️ Wait 500 ms
43. ⏭️ list: language with auto, trash icon
44. ⏭️ Click `[aria-label='Delete list']`
45. ⏭️ **Check:** Page shows "Its numbers are kept"
46. ⏭️ delete list confirm
47. ⏭️ Click "Cancel"
48. ⏭️ Open /admin/lists/not-a-uuid
49. ⏭️ **Check:** Page shows "List not found"
50. ⏭️ **Check:** Page shows "Lists"
51. ⏭️ malformed list id
52. ⏭️ Open /admin/lists/00000000-0000-0000-0000-000000000000
53. ⏭️ **Check:** Page shows "List not found"
54. ⏭️ unknown list id

**What this does not show**

- Archive and Delete list dialogs are opened and cancelled, never confirmed
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
