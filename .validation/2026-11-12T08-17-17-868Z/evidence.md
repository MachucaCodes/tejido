**Browser check — Ship check: share block states: FAILED** (0/9 checks, 1/17 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `9727d45acc` on `clock-2836078f-ui-mockup-step-5-after-create-nothing`
- Environment: production after merge of #12, read-only (nothing saved or sent) — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:17:24.848Z (12.7s)

**Steps**

1. ✅ Open /admin/sessions/why-statement-v2 (399 ms)
2. ❌ **Check:** Page shows "Archived" (10003 ms)
   - locator.waitFor: Timeout 10000ms exceeded. (stopped at the app's sign-in page: no login for this address on this machine (see "Signing in on previews" in clock-validate help))
3. ⏭️ **Check:** archived 0-voice session: no share block
4. ⏭️ **Check:** Page shows "0 voices"
5. ⏭️ archived, 0 voices: plain overview
6. ⏭️ Open /admin/sessions/daily-life-together
7. ⏭️ **Check:** capture what is copied
8. ⏭️ Click "Copy link"
9. ⏭️ **Check:** Page shows "Copied"
10. ⏭️ **Check:** copies the full join URL
11. ⏭️ copied
12. ⏭️ Reload the page
13. ⏭️ **Check:** make the clipboard refuse
14. ⏭️ Click "Copy link"
15. ⏭️ **Check:** Page shows "Copy it by hand"
16. ⏭️ **Check:** link text selected
17. ⏭️ share card copy failed

**What this does not show**

- Clipboard failure is forced by replacing navigator.clipboard in the page
- No closed session exists to view; archived covers the not-open path
- No session is created
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
