**Browser check — New session: chat fills the one form: PASSED** (10/10 checks, 18/18 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `b0c9f11c1a` on `clock-29c0bd3f-ui-mockup-step-5-after-the-chat-drafts` (with uncommitted changes)
- Environment: This branch (next start, local), Tejido production Supabase via dev env; nothing is created (Create is never clicked) — http://localhost:3013, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:08:31.448Z (34.8s)

**Steps**

1. ✅ Open /admin/new (1478 ms)
2. ✅ **Check:** Page shows "New session" (31 ms)
3. ✅ **Check:** no back link repeating the tab (3050 ms)
4. ✅ **Check:** Page shows "Or fill in the form yourself" (6 ms)
5. ✅ before any draft: chat, form behind a link (0 ms)
6. ✅ Type "Please draft it right away, no questions: ask neighbours what they would like to grow in the shared garden and how much time they could give. Link name garden-draft-test." into `input[placeholder^='Describe what you want']` (33 ms)
7. ✅ Press Enter (16 ms)
8. ✅ **Check:** chat proposes a draft (6314 ms)
9. ✅ **Check:** form link gone once the form is open (3048 ms)
10. ✅ **Check:** no second draft panel (3048 ms)
11. ✅ **Check:** exactly one Create session button (9 ms)
12. ✅ **Check:** the form holds the draft (2 ms)
13. ✅ Wait 1500 ms (1509 ms)
14. ✅ after the draft: page scrolls to the filled form (0 ms)
15. ✅ **Check:** form's first field is in view (21 ms)
16. ✅ **Check:** scroll to the end of the form (32 ms)
17. ✅ Wait 800 ms (803 ms)
18. ✅ end of the form: the one Create session (0 ms)

**What this does not show**

- Create session is not clicked, so no session is saved
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
