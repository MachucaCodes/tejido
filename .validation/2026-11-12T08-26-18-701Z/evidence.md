**Browser check — Before: create error on production: FAILED** (0/1 checks, 1/7 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `5999778a2e` on `clock-c04d863f-ui-fix-explanations-sit-on-the-page` (with uncommitted changes)
- Environment: production, one refused Create (link name exists), nothing written — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), 1440×900, on clock-fsn1
- Ran: 2026-11-12T08:26:25.917Z (15.2s)

**Steps**

1. ✅ Open /admin/new (756 ms)
2. ❌ Click "Or fill in the form yourself" (10004 ms)
   - locator.click: Timeout 10000ms exceeded. (stopped at the app's sign-in page: no login for this address on this machine (see "Signing in on previews" in clock-validate help))
3. ⏭️ Type "esm-rental-policy" into `#slug`
4. ⏭️ Type "(test) Is this link name free?" into `#q`
5. ⏭️ Click `form:has(#slug) button[type=submit]`
6. ⏭️ **Check:** Page shows "code already taken"
7. ⏭️ Before: database words, away from the field

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
