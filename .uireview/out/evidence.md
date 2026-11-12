**Browser check — Lists audit (look only): PASSED** (3/3 checks, 34/34 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `c4eac4d2be` on `clock-bb2dac2a-ui-audit-cold-audit-of-the-lists-part` (with uncommitted changes)
- Environment: production, read-only — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:45:48.465Z (48.9s)

**Steps**

1. ✅ Open /admin (1103 ms)
2. ✅ Wait 1500 ms (1504 ms)
3. ✅ sessions-index (0 ms)
4. ✅ Open /admin/lists (573 ms)
5. ✅ **Check:** Page shows "New list" (19 ms)
6. ✅ lists-index (0 ms)
7. ✅ Click "New list" (66 ms)
8. ✅ Wait 800 ms (804 ms)
9. ✅ new-list-dialog (0 ms)
10. ✅ Press Escape (13 ms)
11. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (1068 ms)
12. ✅ **Check:** Page shows "Members" (24 ms)
13. ✅ **Check:** `(()=>{document.querySelectorAll('ul.divide-y li').forEach((li,i)=>{const n=li.querySelector('p.truncate');if(n)n.textContent='Member '+(i+1);const p=li.querySelector('.font-mono');if(p)p.textContent='+506 0000 000'+i;});return 'ok'})()` is "ok" (9 ms)
14. ✅ list-detail (0 ms)
15. ✅ Click "Edit" (35 ms)
16. ✅ Wait 800 ms (812 ms)
17. ✅ edit-dialog (0 ms)
18. ✅ Press Escape (30 ms)
19. ✅ Wait 500 ms (506 ms)
20. ✅ Click "Add numbers" (68 ms)
21. ✅ Wait 800 ms (807 ms)
22. ✅ add-numbers-dialog (0 ms)
23. ✅ Press Escape (23 ms)
24. ✅ Wait 500 ms (505 ms)
25. ✅ Click `[aria-label='Member actions']` (47 ms)
26. ✅ Wait 600 ms (605 ms)
27. ✅ member-menu (0 ms)
28. ✅ Press Escape (23 ms)
29. ✅ Open /admin/lists/00000000-0000-0000-0000-000000000000 (899 ms)
30. ✅ Wait 1500 ms (1503 ms)
31. ✅ list-404 (0 ms)
32. ✅ Open /admin/lists/not-a-uuid (826 ms)
33. ✅ Wait 1500 ms (1503 ms)
34. ✅ list-bad-id (0 ms)

**What this does not show**

- Look only: no saves, no removes
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
