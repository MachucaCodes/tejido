**Browser check — New session: chat fills the one form: PASSED** (8/8 checks, 15/15 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `92ec6fa795` on `clock-29c0bd3f-ui-mockup-step-5-after-the-chat-drafts` (with uncommitted changes)
- Environment: This branch (next start, local), Tejido production Supabase via dev env; nothing is created (Create is never clicked) — http://localhost:3013, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T07:17:19.074Z (29.8s)

**Steps**

1. ✅ Open /admin/new (1335 ms)
2. ✅ **Check:** Page shows "New session" (22 ms)
3. ✅ **Check:** no back link repeating the tab (3039 ms)
4. ✅ **Check:** Page shows "Or fill in the form yourself" (10 ms)
5. ✅ before any draft: chat, form behind a link (0 ms)
6. ✅ Type "Please draft it right away, no questions: ask neighbours what they would like to grow in the shared garden and how much time they could give. Link name garden-draft-test." into `input[placeholder^='Describe what you want']` (17 ms)
7. ✅ Press Enter (15 ms)
8. ✅ **Check:** chat proposes a draft (6332 ms)
9. ✅ **Check:** form link gone once the form is open (3056 ms)
10. ✅ **Check:** no second draft panel (3057 ms)
11. ✅ **Check:** exactly one Create session button (5 ms)
12. ✅ **Check:** the form holds the draft (18 ms)
13. ✅ after the draft: chat and the filled form (0 ms)
14. ✅ Click `#slug` (26 ms)
15. ✅ form scrolled into view (0 ms)

**What this does not show**

- Create session is not clicked, so no session is saved
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
