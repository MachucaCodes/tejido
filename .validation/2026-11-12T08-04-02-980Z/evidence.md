**Browser check — New session: manual path, form edits reach the chat, Create sends the drafted fields: FAILED** (3/9 checks, 10/20 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `b0c9f11c1a` on `clock-29c0bd3f-ui-mockup-step-5-after-the-chat-drafts`
- Environment: This branch rebased on main (next start, local), Tejido production Supabase; Create is tried on an existing link name so the insert is refused and nothing is written — http://localhost:3013, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:04:04.121Z (151.4s)

**Steps**

1. ✅ Open /admin/new (1533 ms)
2. ✅ **Check:** watch the page's requests (11 ms)
3. ✅ Click "Or fill in the form yourself" (77 ms)
4. ✅ **Check:** manual form opens empty (4 ms)
5. ✅ **Check:** one Create session button (11 ms)
6. ✅ manual path: the one form, empty (0 ms)
7. ✅ Type "frontlandpurchase" into `#slug` (44 ms)
8. ✅ Type "What should we do with the front land?" into `#q` (35 ms)
9. ✅ Type "Draft the rest from what I typed in the form, no questions. Keep my link name exactly." into `input[placeholder^='Describe what you want']` (15 ms)
10. ✅ Press Enter (22 ms)
11. ❌ **Check:** chat drafts (120006 ms)
   - locator.waitFor: Timeout 120000ms exceeded.
12. ⏭️ **Check:** the chat was sent what I typed in the form
13. ⏭️ **Check:** the form now holds the chat's intro and instructions
14. ⏭️ Type "frontlandpurchase" into `#slug`
15. ⏭️ Wait 800 ms
16. ⏭️ Click "Create session"
17. ⏭️ **Check:** Create posts and shows the server's answer
18. ⏭️ **Check:** stays on the page, nothing created
19. ⏭️ **Check:** Create sent the chat's intro and instructions (not dropped)
20. ⏭️ Create error shown under the form

**What this does not show**

- No session is actually created; Create is checked up to the server's 'code already taken' answer
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
