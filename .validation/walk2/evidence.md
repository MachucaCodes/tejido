**Browser check — Start a session: chat builder draft, stop before Create: FAILED** (0/1 checks, 8/9 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `fa2062dfcf` on `clock-275983d2-ui-audit-walk-start-a-session-as-an` (with uncommitted changes)
- Environment: production, signed in as Dane, look only (chat drafts only, nothing created) — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-13T19:05:29.398Z (100.6s)

**Steps**

1. ✅ Open /admin/new (2086 ms)
2. ✅ Wait 1500 ms (1502 ms)
3. ✅ Type "I want to hear how neighbours feel about the shared tool library and how it should be run." into `input[placeholder^='Describe']` (20 ms)
4. ✅ Press Enter (9 ms)
5. ✅ Wait 2500 ms (2503 ms)
6. ✅ 5 chat replying (loading) (0 ms)
7. ✅ Wait 30000 ms (30004 ms)
8. ✅ 6 after first reply (0 ms)
9. ❌ **Check:** form filled? (45034 ms)
   - got "false"

**What this does not show**

- Create session not clicked
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
