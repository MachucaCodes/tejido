**Browser check — PR4: admin nav, session tabs, synthesis, loading, not-found, member error, list description, home: FAILED** (13/20 checks, 37/50 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `8397bcebff` on `clock-df16d974-admin-nav-headers` (with uncommitted changes)
- Environment: local build of this branch with two local-only simulations (4s delay on the session page; remove-member request pointed at a missing route); prod Supabase read-only — http://localhost:4173, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T05:23:51.684Z (51.8s)

**Steps**

1. ✅ Open /admin (1371 ms)
2. ✅ **Check:** Page shows "All sessions" (31 ms)
3. ✅ home at 900px: sessions start in view (0 ms)
4. ✅ Open /admin/lists (862 ms)
5. ✅ **Check:** `document.querySelector('nav[aria-label=Admin] [aria-current=page]')?.textContent` is "Lists" (4 ms)
6. ✅ **Check:** nav lines up with content (39 ms)
7. ✅ lists: Lists marked current, edges aligned (0 ms)
8. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (842 ms)
9. ✅ **Check:** Page shows "Internal testing" (22 ms)
10. ✅ list detail: description under heading (0 ms)
11. ✅ Click `[aria-label='Member actions']` (47 ms)
12. ✅ Click "Remove from list" (60 ms)
13. ✅ Click "Click again to remove" (52 ms)
14. ✅ **Check:** Page shows "Couldn't remove" (13 ms)
15. ✅ member removal failure shown (simulated) (0 ms)
16. ✅ Open /admin/sessions (799 ms)
17. ✅ Click "evolving-why-statement" (73 ms)
18. ✅ Wait 800 ms (811 ms)
19. ✅ **Check:** `[aria-busy=true]` is visible (21 ms)
20. ✅ loading skeleton while session loads (4s simulated delay) (0 ms)
21. ✅ **Check:** Page shows "Overview" (2941 ms)
22. ✅ **Check:** `document.querySelector('nav[aria-label="Session pages"] [aria-current=page]')?.textContent` is "Overview" (24 ms)
23. ✅ **Check:** `document.querySelector('nav[aria-label=Admin] [aria-current=page]')?.textContent` is "Sessions" (20 ms)
24. ✅ session overview with tabs (0 ms)
25. ✅ Press End (35 ms)
26. ✅ Wait 500 ms (544 ms)
27. ✅ **Check:** admin nav sticks under the site header (14 ms)
28. ✅ scrolled: admin nav still visible (0 ms)
29. ✅ Click "Synthesis" (144 ms)
30. ✅ **Check:** Page shows "Find sources" (297 ms)
31. ✅ **Check:** Page does not show "Where did this come from?" (3206 ms)
32. ✅ synthesis: Find sources in header (0 ms)
33. ✅ Click "Find sources" (112 ms)
34. ✅ **Check:** Page shows "Where did this come from?" (36 ms)
35. ✅ find sources dialog (0 ms)
36. ✅ Press Escape (16 ms)
37. ✅ Click "Logs" (70 ms)
38. ❌ **Check:** `document.querySelector('nav[aria-label="Session pages"] [aria-current=page]')?.textContent` is "Logs" (10120 ms)
   - got "Synthesis"
39. ⏭️ logs with same header
40. ⏭️ Open /admin/sessions/shared-spaces/synthesis
41. ⏭️ **Check:** Page shows "No summary yet. It's written once people have answered."
42. ⏭️ **Check:** Page does not show "Find sources"
43. ⏭️ **Check:** Page does not show "Rebuild"
44. ⏭️ **Check:** Page does not show "every answer so far"
45. ⏭️ empty synthesis
46. ⏭️ Open /admin/sessions/no-such-session-xyz
47. ⏭️ **Check:** Page shows "Session not found"
48. ⏭️ missing session
49. ⏭️ Click "← Sessions"
50. ⏭️ **Check:** URL matches /admin/sessions$

**What this does not show**

- Loading delay and member-removal failure are simulated locally; no member is removed
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
