**Browser check — Archived row readable: PASSED** (2/2 checks, 4/4 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `788043366b` on `clock-b05f7733-ui-fix-list-page-has-a-lists-back-link` (with uncommitted changes)
- Environment: PR #14 Vercel preview, production Supabase, read-only — https://tejido-git-clock-b05f7733-ui-fix-lis-6fe2f9-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T07:40:12.858Z (7.7s)

**Steps**

1. ✅ Open /admin (2442 ms)
2. ✅ **Check:** Page shows "Archived (1)" (30 ms)
3. ✅ **Check:** archived row is not faded (9 ms)
4. ✅ Archived section in view (0 ms)

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
