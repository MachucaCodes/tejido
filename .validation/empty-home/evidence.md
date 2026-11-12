**Browser check — Empty sessions home has a New session button (local mock): PASSED** (2/2 checks, 4/4 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `14f93c37e6` on `clock-b05f7733-ui-fix-list-page-has-a-lists-back-link` (with uncommitted changes)
- Environment: next dev of this branch on the VM; admin guard stubbed, Supabase pointed at a local fake API that returns no sessions. No real data. — http://localhost:4180, Chrome 157.0.8103.38 (headless), 1440×900, on clock-fsn1
- Ran: 2026-11-12T07:38:55.241Z (4.7s)

**Steps**

1. ✅ Open /admin (483 ms)
2. ✅ **Check:** Page shows "No sessions yet" (29 ms)
3. ✅ **Check:** `main a[href='/admin/new']` is visible (5 ms)
4. ✅ Empty home: No sessions yet + New session button (0 ms)

**What this does not show**

- Local mock: the real admin account has sessions, so the empty state can't show on the preview
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
