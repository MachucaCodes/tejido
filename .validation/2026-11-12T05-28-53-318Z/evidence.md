**Browser check — tab isolation 2: FAILED** (0/3 checks, 2/7 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `8397bcebff` on `clock-df16d974-admin-nav-headers` (with uncommitted changes)
- Environment: (not stated) — http://localhost:4173, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T05:28:54.510Z (49.1s)

**Steps**

1. ✅ Open /admin/sessions/evolving-why-statement (5917 ms)
2. ✅ Click `nav[aria-label='Session pages'] a[href$='/logs']` (86 ms)
3. ❌ **Check:** URL matches /logs$ (30179 ms)
   - URL is http://localhost:4173/admin/sessions/evolving-why-statement
4. ⏭️ Click `nav[aria-label='Session pages'] a[href$='/synthesis']`
5. ⏭️ **Check:** URL matches /synthesis$
6. ⏭️ Click `nav[aria-label='Session pages'] a[href$='/evolving-why-statement']`
7. ⏭️ **Check:** URL matches /evolving-why-statement$

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
