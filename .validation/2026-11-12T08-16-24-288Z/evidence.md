**Browser check — Rebased on Settings tab: share block until the first voice: FAILED** (0/13 checks, 1/20 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `9727d45acc` on `clock-2836078f-ui-mockup-step-5-after-create-nothing`
- Environment: production after merge of #12, read-only (nothing saved or sent) — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:16:31.057Z (16.5s)

**Steps**

1. ✅ Open /admin/sessions/daily-life-together?created=1 (1048 ms)
2. ❌ **Check:** created line shows after Create (10005 ms)
   - locator.waitFor: Timeout 10000ms exceeded. (stopped at the app's sign-in page: no login for this address on this machine (see "Signing in on previews" in clock-validate help))
3. ⏭️ **Check:** Page shows "/s/daily-life-together"
4. ⏭️ **Check:** invites card under the link
5. ⏭️ **Check:** Page shows "Settings"
6. ⏭️ **Check:** no second copy button in the header
7. ⏭️ **Check:** no Status row on Overview
8. ⏭️ new session: link and invites lead
9. ⏭️ **Check:** created param removed
10. ⏭️ Reload the page
11. ⏭️ **Check:** reload doesn't repeat it
12. ⏭️ Open /admin/sessions/esm-rental-policy
13. ⏭️ **Check:** Page shows "3 voices"
14. ⏭️ **Check:** Page shows "Copy join link"
15. ⏭️ **Check:** Page shows "Send invites"
16. ⏭️ session with voices: results lead, buttons in header
17. ⏭️ **Check:** make the clipboard refuse
18. ⏭️ Click "Copy join link"
19. ⏭️ **Check:** failed copy shows the link, selected
20. ⏭️ header copy failed

**What this does not show**

- No session is created: ?created=1 is opened by hand on an existing 0-voice session
- Invites are not sent
- Clipboard failure is forced by replacing navigator.clipboard in the page
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
