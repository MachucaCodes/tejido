**Browser check — List page: members first, add numbers in a dialog: FAILED** (0/4 checks, 1/12 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `da2c2519e6` on `clock-02d9bcf8-ui-mockup-list-page-opens-on-a-big-add` (with uncommitted changes)
- Environment: next start of this branch, production Supabase, read-only (nothing added) — http://127.0.0.1:4173, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T05:54:38.468Z (15.3s)

**Steps**

1. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (126 ms)
2. ❌ **Check:** Page shows "Members" (10005 ms)
   - locator.waitFor: Timeout 10000ms exceeded.
3. ⏭️ **Check:** Page does not show "Or paste numbers"
4. ⏭️ List page opens on Members
5. ⏭️ Click "Add numbers"
6. ⏭️ **Check:** Page shows "Or paste numbers"
7. ⏭️ Add numbers dialog
8. ⏭️ Click `[aria-label='How to paste numbers']`
9. ⏭️ Wait 600 ms
10. ⏭️ Paste help behind the info icon
11. ⏭️ Press Escape
12. ⏭️ **Check:** Page does not show "Or paste numbers"

**What this does not show**

- Does not add any number (production data)
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
