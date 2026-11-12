**Browser check — Info icon opens on tap at 390: PASSED** (4/4 checks, 18/18 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `e8a0171bc0` on `clock-abe489d2-ui-fix-lists-index-stacks-a-create-list`
- Environment: PR #8 preview, production Supabase, signed in as Dane (admin) — https://tejido-git-clock-abe489d2-ui-fix-lis-1c9b44-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 390×844, on clock-fsn1
- Ran: 2026-11-12T06:30:08.506Z (15.7s)

**Steps**

1. ✅ Open /admin/new (1972 ms)
2. ✅ Click "Or fill in the form yourself" (62 ms)
3. ✅ Click `[aria-label='About the link name']` (66 ms)
4. ✅ **Check:** Page shows "The join link is /s/" (7 ms)
5. ✅ form info opened by click at 390 (0 ms)
6. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (675 ms)
7. ✅ Click "Add numbers" (60 ms)
8. ✅ Click `[aria-label='How to paste numbers']` (52 ms)
9. ✅ **Check:** Page shows "Numbers without a + are read as Costa Rica" (4 ms)
10. ✅ paste help opened by click at 390 (0 ms)
11. ✅ Open /admin/sessions/daily-life-together (1220 ms)
12. ✅ Click `[aria-label='About privacy']` (57 ms)
13. ✅ **Check:** Page shows "can opt in" (13 ms)
14. ✅ privacy help opened by click at 390 (0 ms)
15. ✅ Press Escape (16 ms)
16. ✅ Click `[aria-label='About WhatsApp invites']` (67 ms)
17. ✅ **Check:** Page shows "A number on several lists gets one invite" (15 ms)
18. ✅ invites help opened by click at 390 (0 ms)

**What this does not show**

- Mouse click, not a real touch event
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
