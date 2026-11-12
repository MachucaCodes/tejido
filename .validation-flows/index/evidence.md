**Browser check — Lists index: PASSED** (2/2 checks, 4/4 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `a0ba74c90b` on `clock-adf3df2a-ui-audit-cold-audit-of-the-lists-part` (with uncommitted changes)
- Environment: production, read-only — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T03:50:12.007Z (10.8s)

**Steps**

1. ✅ Open /admin/lists (1291 ms)
2. ✅ **Check:** Page shows "Named groups" (128 ms)
3. ✅ **Check:** hide header name (18 ms)
4. ✅ lists index (0 ms)

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
