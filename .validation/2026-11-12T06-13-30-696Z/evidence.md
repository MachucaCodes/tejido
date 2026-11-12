**Browser check — Session overview round 2: privacy one line, info tooltips: PASSED** (6/6 checks, 11/11 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `f70ad7bde6` on `clock-2d4e9318-ui-mockup-session-overview-is-7-screens` (with uncommitted changes)
- Environment: PR #7 preview, production database, read-only (no clicks that write) — https://tejido-git-clock-2d4e9318-ui-mockup-2d6068-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:13:32.215Z (25.2s)

**Steps**

1. ✅ Open /admin/sessions/evolving-why-statement (1901 ms)
2. ✅ **Check:** Page shows "Themes · 28" (80 ms)
3. ✅ **Check:** invite explanation not on the page (3135 ms)
4. ✅ **Check:** privacy explanation not on the page (3133 ms)
5. ✅ **Check:** `(() => { const h=[...document.querySelectorAll('h2')].find(e=>e.textContent.includes('Anonymous session')||e.textContent.includes('Connect session')); h.scrollIntoView({block:'center'}); return true; })()` is true (30 ms)
6. ✅ Wait 500 ms (510 ms)
7. ✅ invites and privacy at 1440 (0 ms)
8. ✅ **Check:** focus the privacy info icon (keyboard) (58 ms)
9. ✅ Wait 1200 ms (1215 ms)
10. ✅ **Check:** privacy explanation shows in the tooltip (27 ms)
11. ✅ privacy tooltip open (0 ms)

**What this does not show**

- Looks only: nothing sent, saved or toggled
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
