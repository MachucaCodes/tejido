**Browser check — Sessions audit: synthesis, logs, states: FAILED** (5/6 checks, 41/42 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `c4eac4d2be` on `clock-7fd4f6b1-ui-audit-cold-audit-of-the-sessions` (with uncommitted changes)
- Environment: production, read-only — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:46:36.756Z (108.9s)

**Steps**

1. ✅ Open /admin/sessions/esm-rental-policy/synthesis (1262 ms)
2. ✅ Wait 3000 ms (3002 ms)
3. ✅ syn-top (0 ms)
4. ✅ **Check:** `window.scrollTo(0,800); true` is true (8 ms)
5. ✅ Wait 600 ms (604 ms)
6. ✅ syn-mid (0 ms)
7. ✅ Open /admin/sessions/esm-rental-policy/logs (1724 ms)
8. ✅ Wait 3000 ms (3010 ms)
9. ✅ logs-top (0 ms)
10. ✅ Click "Filter" (319 ms)
11. ✅ Wait 800 ms (815 ms)
12. ✅ logs-filter-open (0 ms)
13. ✅ Press Escape (36 ms)
14. ✅ **Check:** `document.querySelector('main details summary').click(); true` is true (17 ms)
15. ✅ Wait 800 ms (816 ms)
16. ✅ logs-row-open (0 ms)
17. ✅ Open /admin/sessions/daily-life-together (1178 ms)
18. ✅ Wait 3000 ms (3003 ms)
19. ✅ empty-detail (0 ms)
20. ✅ Open /admin/sessions/daily-life-together/synthesis (786 ms)
21. ✅ Wait 3000 ms (3003 ms)
22. ✅ empty-syn (0 ms)
23. ✅ Open /admin/sessions/daily-life-together/logs (633 ms)
24. ✅ Wait 3000 ms (3003 ms)
25. ✅ empty-logs (0 ms)
26. ✅ Open /admin/sessions/why-statement-v2 (841 ms)
27. ✅ Wait 3000 ms (3011 ms)
28. ✅ archived-detail (0 ms)
29. ✅ Open /admin/sessions/no-such-session-xyz (707 ms)
30. ✅ Wait 3000 ms (3003 ms)
31. ✅ missing (0 ms)
32. ✅ Open /admin/sessions/esm-rental-policy (835 ms)
33. ✅ Wait 3000 ms (3004 ms)
34. ✅ **Check:** `[...document.querySelectorAll('main details > summary')].find(s=>s.textContent.includes('Edit session')).click(); true` is true (15 ms)
35. ✅ Wait 800 ms (806 ms)
36. ✅ **Check:** `[...document.querySelectorAll('main details > summary')].find(s=>s.textContent.includes('Edit session')).scrollIntoView(); true` is true (5 ms)
37. ✅ Wait 600 ms (606 ms)
38. ✅ edit-open (0 ms)
39. ✅ **Check:** `window.scrollBy(0,800); true` is true (12 ms)
40. ✅ Wait 500 ms (511 ms)
41. ✅ edit-open-2 (0 ms)
42. ❌ **Check:** height with edit open (info) (10099 ms)
   - got 2079

**What this does not show**

- Look only; no saving
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
