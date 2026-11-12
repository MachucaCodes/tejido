**Browser check — Admin Lists audit (look only): FAILED** (4/5 checks, 14/23 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `b75b29aa35` on `clock-b1b6022f-ui-audit-cold-audit-of-the-lists-part` (with uncommitted changes)
- Environment: production, read-only look — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T05:48:24.802Z (34.5s)

**Steps**

1. ✅ Open /admin/lists (995 ms)
2. ✅ **Check:** Page shows "Lists" (39 ms)
3. ✅ lists index as it opens (0 ms)
4. ✅ Open /admin/sessions (752 ms)
5. ✅ sessions index for comparison (0 ms)
6. ✅ Open /admin (893 ms)
7. ✅ admin home for comparison (0 ms)
8. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (1163 ms)
9. ✅ **Check:** Page shows "Members" (45 ms)
10. ✅ **Check:** hide member names and phones (6 ms)
11. ✅ list detail top (0 ms)
12. ✅ **Check:** `(()=>{window.scrollTo(0,document.body.scrollHeight);return true})()` is true (3 ms)
13. ✅ Wait 500 ms (503 ms)
14. ✅ list detail bottom (0 ms)
15. ❌ **Check:** measure page height and where Members starts (10149 ms)
   - got "{\"h\":1079,\"membersTop\":626}"
16. ⏭️ Click `[aria-label='Member actions']`
17. ⏭️ Wait 400 ms
18. ⏭️ member actions menu open (not clicked)
19. ⏭️ Press Escape
20. ⏭️ Open /admin/lists/00000000-0000-0000-0000-000000000000
21. ⏭️ missing list (valid uuid)
22. ⏭️ Open /admin/lists/not-a-list
23. ⏭️ malformed list id

**What this does not show**

- Look only: no form submitted, no member removed
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
