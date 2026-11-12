**Browser check — List page: header + members; add and edit in dialogs: PASSED** (8/8 checks, 19/19 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `d9024d7cea` on `clock-02d9bcf8-ui-mockup-list-page-opens-on-a-big-add` (with uncommitted changes)
- Environment: PR preview, production Supabase, read-only (nothing added) — https://tejido-git-clock-02d9bcf8-ui-mockup-e5f195-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:17:10.738Z (36.7s)

**Steps**

1. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (3061 ms)
2. ✅ **Check:** Page shows "Members" (30 ms)
3. ✅ **Check:** Page does not show "List settings" (3061 ms)
4. ✅ **Check:** Page does not show "Or paste numbers" (3061 ms)
5. ✅ Page is the header and the members (0 ms)
6. ✅ Click "Add numbers" (82 ms)
7. ✅ **Check:** Page shows "Or paste numbers" (16 ms)
8. ✅ Add numbers dialog (0 ms)
9. ✅ Press Escape (30 ms)
10. ✅ Click `button:has-text('Edit')` (41 ms)
11. ✅ **Check:** Page shows "Edit list" (8 ms)
12. ✅ Edit list dialog: Name, Description, Save, delete apart (0 ms)
13. ✅ Click `[aria-label='Delete list']` (169 ms)
14. ✅ **Check:** Page shows "Its numbers are kept" (35 ms)
15. ✅ Delete asks to confirm (0 ms)
16. ✅ Click "Cancel" (41 ms)
17. ✅ **Check:** Page shows "Edit list" (10 ms)
18. ✅ Press Escape (24 ms)
19. ✅ **Check:** Page does not show "Edit list" (3056 ms)

**What this does not show**

- Does not save, add or delete anything (production data)
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
