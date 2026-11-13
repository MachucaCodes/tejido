**Browser check — Start a session: chat builder to a draft, stop before Create: FAILED** (4/5 checks, 16/17 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `fa2062dfcf` on `clock-275983d2-ui-audit-walk-start-a-session-as-an` (with uncommitted changes)
- Environment: production, signed in as Dane, look only (chat drafts only, nothing created) — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-13T19:07:26.362Z (39.9s)

**Steps**

1. ✅ Open /admin/new (1869 ms)
2. ✅ Wait 1500 ms (1503 ms)
3. ✅ Type "I want to hear how neighbours feel about the shared tool library and how it should be run." into `input[placeholder^='Describe']` (19 ms)
4. ✅ Press Enter (9 ms)
5. ✅ Wait 1200 ms (1203 ms)
6. ✅ 5a waiting for the first reply (0 ms)
7. ✅ **Check:** reply 1 done (5 ms)
8. ✅ Type "Everyone who lives here. Keep it simple, anonymous is fine. You have enough, please draft it now." into `input[placeholder^='Describe']` (6 ms)
9. ✅ Press Enter (5 ms)
10. ✅ Wait 5000 ms (5002 ms)
11. ✅ **Check:** reply 2 done (408 ms)
12. ✅ Wait 2500 ms (2504 ms)
13. ✅ 5b after reply 2 (0 ms)
14. ✅ **Check:** form shown (2 ms)
15. ✅ **Check:** `window.scrollTo(0,0); 'ok'` is "ok" (3 ms)
16. ✅ 5c top of page after draft (0 ms)
17. ❌ **Check:** measure numbers (expected to fail, prints values) (10161 ms)
   - got "{\"slug\":\"tool-library\",\"scrollH\":1502,\"btnY\":1421}"

**What this does not show**

- Create session not clicked
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
