**Browser check — Live: Before merge: overview, invites dialog, settings, archived: FAILED** (0/8 checks, 1/17 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `017bcb1ad1` on `clock-34d425ea-ui-mockup-overview-stacks-four-jobs` (with uncommitted changes)
- Environment: production after merge, read-only (nothing saved or sent) — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:06:44.346Z (16.7s)

**Steps**

1. ✅ Open /admin/sessions/esm-rental-policy (1305 ms)
2. ❌ **Check:** Page shows "Themes" (10006 ms)
   - locator.waitFor: Timeout 10000ms exceeded. (stopped at the app's sign-in page: no login for this address on this machine (see "Signing in on previews" in clock-validate help))
3. ⏭️ **Check:** Page does not show "Couldn't load"
4. ⏭️ Overview
5. ⏭️ Click "Send invites"
6. ⏭️ **Check:** Page shows "Send on WhatsApp"
7. ⏭️ **Check:** Page does not show "Couldn't load"
8. ⏭️ Send invites dialog (nothing sent)
9. ⏭️ Press Escape
10. ⏭️ Click `nav[aria-label='Session pages'] >> text=Settings`
11. ⏭️ **Check:** Page shows "Close session"
12. ⏭️ **Check:** Page shows "Save changes"
13. ⏭️ Settings
14. ⏭️ Open /admin/sessions/why-statement-v2
15. ⏭️ **Check:** Page does not show "Send invites"
16. ⏭️ Open /admin/sessions/no-such-session-xyz
17. ⏭️ **Check:** Page shows "Session not found"

**What this does not show**

- Looks only: Close session confirm opened then cancelled; nothing saved or sent
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
