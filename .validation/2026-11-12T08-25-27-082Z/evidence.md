**Browser check — New session: link name, plain errors, draft kept on reload: PASSED** (12/12 checks, 24/24 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `5999778a2e` on `clock-c04d863f-ui-fix-explanations-sit-on-the-page` (with uncommitted changes)
- Environment: PR #15 Vercel preview, production database. One Create with a link name that already exists: refused, nothing written. — https://tejido-git-clock-c04d863f-ui-fix-exp-435661-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:25:28.348Z (31.2s)

**Steps**

1. ✅ Open /admin/new (1961 ms)
2. ✅ **Check:** Page shows "New session" (21 ms)
3. ✅ Click "Or fill in the form yourself" (51 ms)
4. ✅ Type "ESM Rental Policy" into `#slug` (28 ms)
5. ✅ **Check:** spaces became hyphens, capitals lowercased (5 ms)
6. ✅ **Check:** full join link under the field (5 ms)
7. ✅ Type "(test) Is this link name free?" into `#q` (21 ms)
8. ✅ Link name with the join link under it (0 ms)
9. ✅ Reload the page (704 ms)
10. ✅ **Check:** form survives a reload (6 ms)
11. ✅ **Check:** (test setup) saved chat with a draft and no reply text, to avoid a paid AI call (5 ms)
12. ✅ Reload the page (737 ms)
13. ✅ **Check:** draft without words gets a line in the chat (18 ms)
14. ✅ Chat and form restored after reload (0 ms)
15. ✅ Click `form:has(#slug) button[type=submit]` (46 ms)
16. ✅ **Check:** plain error (link name exists, nothing created) (185 ms)
17. ✅ **Check:** error sits under Link name (21 ms)
18. ✅ **Check:** Create turns back on after a refusal (4 ms)
19. ✅ Taken link name: message under the field (0 ms)
20. ✅ Click "Sessions" (63 ms)
21. ✅ **Check:** URL matches /admin$ (0 ms)
22. ✅ Open /admin/new (1195 ms)
23. ✅ **Check:** form survives going to Sessions and back (5 ms)
24. ✅ **Check:** (cleanup) clear the test draft (3 ms)

**What this does not show**

- No real session created, so 'Create stays off while the new page loads' and 'cleared after create' are checked in code only
- No live chat turn (paid AI call): the chat's draft line is shown from a saved test chat
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
