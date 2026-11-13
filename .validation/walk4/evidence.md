**Browser check — Start a session: manual form states and the landing page: PASSED** (1/1 checks, 20/20 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `fa2062dfcf` on `clock-275983d2-ui-audit-walk-start-a-session-as-an` (with uncommitted changes)
- Environment: production, signed in as Dane, look only — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-13T19:09:19.170Z (34.9s)

**Steps**

1. ✅ Open /admin/new (1511 ms)
2. ✅ Wait 1200 ms (1204 ms)
3. ✅ Click "Or fill in the form yourself" (70 ms)
4. ✅ Wait 800 ms (810 ms)
5. ✅ manual form empty (0 ms)
6. ✅ Click "Create session" (57 ms)
7. ✅ Wait 800 ms (807 ms)
8. ✅ empty Create: browser validation (0 ms)
9. ✅ Type "Tool Library " into `#slug` (31 ms)
10. ✅ Wait 500 ms (511 ms)
11. ✅ trailing hyphen (0 ms)
12. ✅ Open /admin/sessions/daily-life-together?created=1 (1737 ms)
13. ✅ Wait 2500 ms (2504 ms)
14. ✅ 7 landing with created (0 ms)
15. ✅ Wait 500 ms (509 ms)
16. ✅ **Check:** `window.scrollTo(0, document.body.scrollHeight); 'ok'` is "ok" (11 ms)
17. ✅ 7 landing bottom (0 ms)
18. ✅ Open /admin/sessions/no-such-session-zz (1015 ms)
19. ✅ Wait 1500 ms (1504 ms)
20. ✅ not found (0 ms)

**What this does not show**

- Create session not clicked; landing page shown on an existing 0-voice session with ?created=1
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
