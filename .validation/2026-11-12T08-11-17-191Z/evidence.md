**Browser check — New session: chat fills the one form: FAILED** (2/10 checks, 3/18 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `5317f4aaa0` on `clock-29c0bd3f-ui-mockup-step-5-after-the-chat-drafts`
- Environment: Production (tejido-zeta.vercel.app) after merging #13; nothing is created (Create is never clicked) — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:11:29.518Z (20.9s)

**Steps**

1. ✅ Open /admin/new (1583 ms)
2. ✅ **Check:** Page shows "New session" (74 ms)
3. ✅ **Check:** no back link repeating the tab (3168 ms)
4. ❌ **Check:** Page shows "Or fill in the form yourself" (10031 ms)
   - locator.waitFor: Timeout 10000ms exceeded. (stopped at the app's sign-in page: no login for this address on this machine (see "Signing in on previews" in clock-validate help))
5. ⏭️ before any draft: chat, form behind a link
6. ⏭️ Type "Please draft it right away, no questions: ask neighbours what they would like to grow in the shared garden and how much time they could give. Link name garden-draft-test." into `input[placeholder^='Describe what you want']`
7. ⏭️ Press Enter
8. ⏭️ **Check:** chat proposes a draft
9. ⏭️ **Check:** form link gone once the form is open
10. ⏭️ **Check:** no second draft panel
11. ⏭️ **Check:** exactly one Create session button
12. ⏭️ **Check:** the form holds the draft
13. ⏭️ Wait 1500 ms
14. ⏭️ after the draft: page scrolls to the filled form
15. ⏭️ **Check:** form's first field is in view
16. ⏭️ **Check:** scroll to the end of the form
17. ⏭️ Wait 800 ms
18. ⏭️ end of the form: the one Create session

**What this does not show**

- Create session is not clicked, so no session is saved
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
