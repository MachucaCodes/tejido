**Browser check — New session: chat fills the one form: FAILED** (3/8 checks, 7/15 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `92ec6fa795` on `clock-29c0bd3f-ui-mockup-step-5-after-the-chat-drafts`
- Environment: PR #13 Vercel preview, production Supabase; nothing is created (Create is never clicked) — https://tejido-git-clock-29c0bd3f-ui-mockup-0fa326-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T07:13:06.472Z (167.6s)

**Steps**

1. ✅ Open /admin/new (3711 ms)
2. ✅ **Check:** Page shows "New session" (31 ms)
3. ✅ **Check:** no back link repeating the tab (3048 ms)
4. ✅ **Check:** Page shows "Or fill in the form yourself" (26 ms)
5. ✅ before any draft: chat, form behind a link (0 ms)
6. ✅ Type "Please draft it right away, no questions: ask neighbours what they would like to grow in the shared garden and how much time they could give. Link name garden-draft-test." into `input[placeholder^='Describe what you want']` (17 ms)
7. ✅ Press Enter (30 ms)
8. ❌ **Check:** chat proposes a draft (120009 ms)
   - locator.waitFor: Timeout 120000ms exceeded.
9. ⏭️ **Check:** form link gone once the form is open
10. ⏭️ **Check:** no second draft panel
11. ⏭️ **Check:** exactly one Create session button
12. ⏭️ **Check:** the form holds the draft
13. ⏭️ after the draft: chat and the filled form
14. ⏭️ Click `#slug`
15. ⏭️ form scrolled into view

**What this does not show**

- Create session is not clicked, so no session is saved
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
