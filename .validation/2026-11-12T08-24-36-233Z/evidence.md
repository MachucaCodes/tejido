**Browser check — New session: link name, plain errors, draft kept on reload: FAILED** (6/12 checks, 15/24 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `5999778a2e` on `clock-c04d863f-ui-fix-explanations-sit-on-the-page` (with uncommitted changes)
- Environment: PR #15 Vercel preview, production database. One Create with a link name that already exists: refused, nothing written. — https://tejido-git-clock-c04d863f-ui-fix-exp-435661-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:24:38.265Z (36s)

**Steps**

1. ✅ Open /admin/new (2707 ms)
2. ✅ **Check:** Page shows "New session" (39 ms)
3. ✅ Click "Or fill in the form yourself" (134 ms)
4. ✅ Type "ESM Rental Policy" into `#slug` (19 ms)
5. ✅ **Check:** spaces became hyphens, capitals lowercased (19 ms)
6. ✅ **Check:** full join link under the field (26 ms)
7. ✅ Type "(test) Is this link name free?" into `#q` (37 ms)
8. ✅ Link name with the join link under it (0 ms)
9. ✅ Reload the page (1305 ms)
10. ✅ **Check:** form survives a reload (10 ms)
11. ✅ **Check:** (test setup) saved chat with a draft and no reply text, to avoid a paid AI call (9 ms)
12. ✅ Reload the page (577 ms)
13. ✅ **Check:** draft without words gets a line in the chat (23 ms)
14. ✅ Chat and form restored after reload (0 ms)
15. ✅ Click "Create session" (41 ms)
16. ❌ **Check:** plain error (link name exists, nothing created) (10014 ms)
   - locator.waitFor: Timeout 10000ms exceeded.
17. ⏭️ **Check:** error sits under Link name
18. ⏭️ **Check:** Create turns back on after a refusal
19. ⏭️ Taken link name: message under the field
20. ⏭️ Click "Sessions"
21. ⏭️ **Check:** URL matches /admin$
22. ⏭️ Open /admin/new
23. ⏭️ **Check:** form survives going to Sessions and back
24. ⏭️ **Check:** (cleanup) clear the test draft

**What this does not show**

- No real session created, so 'Create stays off while the new page loads' and 'cleared after create' are checked in code only
- No live chat turn (paid AI call): the chat's draft line is shown from a saved test chat
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
