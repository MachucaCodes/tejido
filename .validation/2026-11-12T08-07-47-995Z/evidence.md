**Browser check — Live: Before merge: overview, invites dialog, settings, archived: PASSED** (8/8 checks, 17/17 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `017bcb1ad1` on `clock-34d425ea-ui-mockup-overview-stacks-four-jobs` (with uncommitted changes)
- Environment: production after merge, read-only (nothing saved or sent) — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:07:49.681Z (37.5s)

**Steps**

1. ✅ Open /admin/sessions/esm-rental-policy (1512 ms)
2. ✅ **Check:** Page shows "Themes" (35 ms)
3. ✅ **Check:** Page does not show "Couldn't load" (3081 ms)
4. ✅ Overview (0 ms)
5. ✅ Click "Send invites" (77 ms)
6. ✅ **Check:** Page shows "Send on WhatsApp" (45 ms)
7. ✅ **Check:** Page does not show "Couldn't load" (3062 ms)
8. ✅ Send invites dialog (nothing sent) (0 ms)
9. ✅ Press Escape (8 ms)
10. ✅ Click `nav[aria-label='Session pages'] >> text=Settings` (108 ms)
11. ✅ **Check:** Page shows "Close session" (812 ms)
12. ✅ **Check:** Page shows "Save changes" (19 ms)
13. ✅ Settings (0 ms)
14. ✅ Open /admin/sessions/why-statement-v2 (793 ms)
15. ✅ **Check:** Page does not show "Send invites" (3084 ms)
16. ✅ Open /admin/sessions/no-such-session-xyz (963 ms)
17. ✅ **Check:** Page shows "Session not found" (28 ms)

**What this does not show**

- Looks only: Close session confirm opened then cancelled; nothing saved or sent
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
