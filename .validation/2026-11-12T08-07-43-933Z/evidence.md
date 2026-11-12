**Browser check — New session: manual path, form edits reach the chat, Create sends the drafted fields: PASSED** (11/11 checks, 26/26 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `b0c9f11c1a` on `clock-29c0bd3f-ui-mockup-step-5-after-the-chat-drafts` (with uncommitted changes)
- Environment: This branch rebased on main (next start, local), Tejido production Supabase; Create is tried on an existing link name so the insert is refused and nothing is written — http://localhost:3013, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:07:45.385Z (35.8s)

**Steps**

1. ✅ Open /admin/new (1831 ms)
2. ✅ **Check:** watch the page's requests (3 ms)
3. ✅ Click "Or fill in the form yourself" (155 ms)
4. ✅ **Check:** manual form opens empty (24 ms)
5. ✅ **Check:** one Create session button (5 ms)
6. ✅ manual path: the one form, empty (0 ms)
7. ✅ Type "frontlandpurchase" into `#slug` (46 ms)
8. ✅ Type "What should we do with the front land?" into `#q` (30 ms)
9. ✅ Type "Draft the rest from what I typed in the form, no questions. Keep my link name exactly." into `input[placeholder^='Describe what you want']` (19 ms)
10. ✅ Press Enter (31 ms)
11. ✅ **Check:** chat drafts (5835 ms)
12. ✅ **Check:** the chat was sent what I typed in the form (9 ms)
13. ✅ **Check:** the form now holds the chat's intro and instructions (2 ms)
14. ✅ Type "What would you like us to do with the front land?" into `#q` (38 ms)
15. ✅ Type "Make the intro one sentence shorter. Keep everything else as it is in the form." into `input[placeholder^='Describe what you want']` (12 ms)
16. ✅ Press Enter (15 ms)
17. ✅ **Check:** chat answered the revision (6522 ms)
18. ✅ **Check:** the revision was sent my edited question (4 ms)
19. ✅ after a revision (0 ms)
20. ✅ Type "frontlandpurchase" into `#slug` (15 ms)
21. ✅ Wait 800 ms (806 ms)
22. ✅ Click "Create session" (46 ms)
23. ✅ **Check:** Create posts and shows the server's answer (1326 ms)
24. ✅ **Check:** stays on the page, nothing created (0 ms)
25. ✅ **Check:** Create sent the chat's intro and instructions (not dropped) (5 ms)
26. ✅ Create error shown under the form (0 ms)

**What this does not show**

- No session is actually created; Create is checked up to the server's 'code already taken' answer
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
