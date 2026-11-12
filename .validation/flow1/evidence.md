**Browser check — Tejido start-a-session path: admin to chat draft: PASSED** (5/5 checks, 36/36 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `c4eac4d2be` on `clock-7c0115a4-ui-audit-path-audit-not-a-screen-audit` (with uncommitted changes)
- Environment: production, signed in as tejido login, look only (no Create) — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T07:04:16.398Z (37.5s)

**Steps**

1. ✅ Open /admin (1553 ms)
2. ✅ Wait 1500 ms (1503 ms)
3. ✅ step1 admin landing (0 ms)
4. ✅ Click "New session" (58 ms)
5. ✅ **Check:** URL matches /admin/new (0 ms)
6. ✅ Wait 1000 ms (1002 ms)
7. ✅ step2 new session page as it opens (0 ms)
8. ✅ Type "I want people on our street to talk about a shared community garden we might start in the empty lot." into `input[placeholder^='Describe']` (43 ms)
9. ✅ Press Enter (18 ms)
10. ✅ loading: turn1 (1503 ms)
11. ✅ loading after: turn1 (0 ms)
12. ✅ **Check:** reply arrived: turn1 (4 ms)
13. ✅ Wait 800 ms (804 ms)
14. ✅ reply: turn1 (0 ms)
15. ✅ Type "Neighbours on Maple Lane, about 30 households, mixed ages." into `input[placeholder^='Describe']` (28 ms)
16. ✅ Press Enter (7 ms)
17. ✅ loading: turn2 (1503 ms)
18. ✅ loading after: turn2 (0 ms)
19. ✅ **Check:** reply arrived: turn2 (3 ms)
20. ✅ Wait 800 ms (811 ms)
21. ✅ reply: turn2 (0 ms)
22. ✅ Type "No reading needed. Facts if asked: the lot belongs to the city and they allow garden leases." into `input[placeholder^='Describe']` (9 ms)
23. ✅ Press Enter (14 ms)
24. ✅ loading: turn3 (1504 ms)
25. ✅ loading after: turn3 (0 ms)
26. ✅ **Check:** reply arrived: turn3 (5 ms)
27. ✅ Wait 800 ms (804 ms)
28. ✅ reply: turn3 (0 ms)
29. ✅ Type "What people would want to grow, how much time they could give, and any worries." into `input[placeholder^='Describe']` (29 ms)
30. ✅ Press Enter (11 ms)
31. ✅ loading: turn4 (1504 ms)
32. ✅ loading after: turn4 (0 ms)
33. ✅ **Check:** reply arrived: turn4 (2488 ms)
34. ✅ Wait 800 ms (803 ms)
35. ✅ reply: turn4 (0 ms)
36. ✅ after 4 turns (0 ms)

**What this does not show**

- Create is never clicked
- Made-up topic
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
