**Browser check — Start a session path: /admin to /admin/new (look only): FAILED** (6/7 checks, 20/21 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `c4eac4d2be` on `clock-f708d36b-ui-audit-path-audit-not-a-screen-audit` (with uncommitted changes)
- Environment: production, look only, nothing submitted — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:57:35.432Z (46.8s)

**Steps**

1. ✅ Open /admin (1086 ms)
2. ✅ Wait 2500 ms (2505 ms)
3. ✅ 01 admin landing (0 ms)
4. ✅ **Check:** body (9 ms)
5. ✅ **Check:** measure admin (3 ms)
6. ✅ Click "New session" (71 ms)
7. ✅ Wait 2500 ms (2505 ms)
8. ✅ 02 new page as it opens (0 ms)
9. ✅ **Check:** measure new (20 ms)
10. ✅ Click "Or fill in the form yourself" (59 ms)
11. ✅ Wait 800 ms (817 ms)
12. ✅ 03 form opened (0 ms)
13. ✅ **Check:** measure form (10 ms)
14. ✅ Type "My Test Session!" into `#slug` (78 ms)
15. ✅ Type "What should we change about the park?" into `#q` (50 ms)
16. ✅ Wait 500 ms (511 ms)
17. ✅ **Check:** slug after typing spaces and caps (14 ms)
18. ✅ **Check:** scroll to Create (7 ms)
19. ✅ Wait 500 ms (512 ms)
20. ✅ 04 form filled up to Create (not clicked) (0 ms)
21. ❌ **Check:** dump measurements (10097 ms)
   - got "{\"audit_\\\"slug after typing spaces and caps\\\"\":\"mytestsession\",\"audit_\\\"measure form\\\"\":\"{\\\"h\\\":1174,\\\"btns\\\":[[\\\"\\\",331],[\\\"\\\",455],[\\\"\\\",601],[\\\"\\\",719],[\\\"\\\",857],[\\\"\\\",995],[\\\"Create session\\\",1093]]}\",\"audit_\\\"measure admin\\\"\":\"{\\\"sessions\\\":10,\\\"newBtn\\\":[{\\\"x\\\":1056.890625,\\\"y\\\":74,\\\"width\\\":95.109375,\\\"he

**What this does not show**

- Create is never clicked; no form saved
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
