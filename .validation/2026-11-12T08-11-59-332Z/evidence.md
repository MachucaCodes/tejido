**Browser check — New session: chat fills the one form: PASSED** (10/10 checks, 18/18 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `5317f4aaa0` on `clock-29c0bd3f-ui-mockup-step-5-after-the-chat-drafts`
- Environment: Production (tejido-zeta.vercel.app) after merging #13; nothing is created (Create is never clicked) — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:12:00.965Z (40.5s)

**Steps**

1. ✅ Open /admin/new (2130 ms)
2. ✅ **Check:** Page shows "New session" (56 ms)
3. ✅ **Check:** no back link repeating the tab (3150 ms)
4. ✅ **Check:** Page shows "Or fill in the form yourself" (12 ms)
5. ✅ before any draft: chat, form behind a link (0 ms)
6. ✅ Type "Please draft it right away, no questions: ask neighbours what they would like to grow in the shared garden and how much time they could give. Link name garden-draft-test." into `input[placeholder^='Describe what you want']` (32 ms)
7. ✅ Press Enter (97 ms)
8. ✅ **Check:** chat proposes a draft (6536 ms)
9. ✅ **Check:** form link gone once the form is open (3237 ms)
10. ✅ **Check:** no second draft panel (3142 ms)
11. ✅ **Check:** exactly one Create session button (20 ms)
12. ✅ **Check:** the form holds the draft (9 ms)
13. ✅ Wait 1500 ms (1517 ms)
14. ✅ after the draft: page scrolls to the filled form (0 ms)
15. ✅ **Check:** form's first field is in view (13 ms)
16. ✅ **Check:** scroll to the end of the form (11 ms)
17. ✅ Wait 800 ms (815 ms)
18. ✅ end of the form: the one Create session (0 ms)

**What this does not show**

- Create session is not clicked, so no session is saved
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
