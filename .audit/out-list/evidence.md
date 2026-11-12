**Browser check — Sessions audit: list + detail: FAILED** (3/4 checks, 15/16 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `c4eac4d2be` on `clock-7fd4f6b1-ui-audit-cold-audit-of-the-sessions` (with uncommitted changes)
- Environment: production, read-only — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:45:30.249Z (47.4s)

**Steps**

1. ✅ Open /admin/sessions (1563 ms)
2. ✅ Wait 2500 ms (2508 ms)
3. ✅ list-top (0 ms)
4. ✅ **Check:** `window.scrollTo(0, document.body.scrollHeight); true` is true (5 ms)
5. ✅ Wait 600 ms (603 ms)
6. ✅ list-bottom (0 ms)
7. ✅ Open /admin/sessions/esm-rental-policy (1949 ms)
8. ✅ Wait 3500 ms (3508 ms)
9. ✅ detail-top (0 ms)
10. ✅ **Check:** `window.scrollTo(0, 900); true` is true (25 ms)
11. ✅ Wait 600 ms (610 ms)
12. ✅ detail-mid (0 ms)
13. ✅ **Check:** `window.scrollTo(0, document.body.scrollHeight); true` is true (4 ms)
14. ✅ Wait 600 ms (608 ms)
15. ✅ detail-bottom (0 ms)
16. ❌ **Check:** page height (info) (10137 ms)
   - got 1079

**What this does not show**

- Look only; no saving
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
