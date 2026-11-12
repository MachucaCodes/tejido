**Browser check — tab click isolation: FAILED** (0/4 checks, 2/11 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `8397bcebff` on `clock-df16d974-admin-nav-headers` (with uncommitted changes)
- Environment: (not stated) — http://localhost:4173, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T05:27:29.661Z (45s)

**Steps**

1. ✅ Open /admin/sessions/evolving-why-statement/synthesis (1570 ms)
2. ✅ Click `nav[aria-label='Session pages'] a[href$='/logs']` (69 ms)
3. ❌ **Check:** URL matches /logs$ (30070 ms)
   - URL is http://localhost:4173/admin/sessions/evolving-why-statement/synthesis
4. ⏭️ Open /admin/sessions/evolving-why-statement/synthesis
5. ⏭️ Click "Find sources"
6. ⏭️ **Check:** Page shows "Where did this come from?"
7. ⏭️ Press Escape
8. ⏭️ Wait 1000 ms
9. ⏭️ **Check:** `document.body.style.pointerEvents + '|' + document.querySelectorAll('[data-slot=dialog-content]').length + '|' + document.querySelectorAll('[inert]').length` is "|0|0"
10. ⏭️ Click `nav[aria-label='Session pages'] a[href$='/logs']`
11. ⏭️ **Check:** URL matches /logs$

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
