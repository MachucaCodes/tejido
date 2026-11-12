**Browser check — List page: header + members; add and edit in dialogs: PASSED** (8/8 checks, 19/19 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `d9024d7cea` on `clock-02d9bcf8-ui-mockup-list-page-opens-on-a-big-add` (with uncommitted changes)
- Environment: production after merge, read-only (nothing saved, added or deleted) — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:21:55.250Z (34.9s)

**Steps**

1. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (1819 ms)
2. ✅ **Check:** Page shows "Members" (25 ms)
3. ✅ **Check:** Page does not show "List settings" (3038 ms)
4. ✅ **Check:** Page does not show "Or paste numbers" (3057 ms)
5. ✅ Page is the header and the members (0 ms)
6. ✅ Click "Add numbers" (57 ms)
7. ✅ **Check:** Page shows "Or paste numbers" (14 ms)
8. ✅ Add numbers dialog (0 ms)
9. ✅ Press Escape (49 ms)
10. ✅ Click `button:has-text('Edit')` (49 ms)
11. ✅ **Check:** Page shows "Edit list" (4 ms)
12. ✅ Edit list dialog: Name, Description, Save, delete apart (0 ms)
13. ✅ Click `[aria-label='Delete list']` (95 ms)
14. ✅ **Check:** Page shows "Its numbers are kept" (17 ms)
15. ✅ Delete asks to confirm (0 ms)
16. ✅ Click "Cancel" (44 ms)
17. ✅ **Check:** Page shows "Edit list" (6 ms)
18. ✅ Press Escape (12 ms)
19. ✅ **Check:** Page does not show "Edit list" (3055 ms)

**What this does not show**

- Does not save, add or delete anything (production data)
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
