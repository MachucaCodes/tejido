**Browser check — Session overview round 2: privacy one line, info tooltips (live): FAILED** (0/6 checks, 1/11 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `f70ad7bde6` on `clock-2d4e9318-ui-mockup-session-overview-is-7-screens` (with uncommitted changes)
- Environment: production after merge, looked only — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), 1440×900, on clock-fsn1
- Ran: 2026-11-12T06:22:26.746Z (40.5s)

**Steps**

1. ✅ Open /admin/sessions/evolving-why-statement (758 ms)
2. ❌ **Check:** Page shows "Themes · 28" (30004 ms)
   - locator.waitFor: Timeout 30000ms exceeded. (stopped at the app's sign-in page: no login for this address on this machine (see "Signing in on previews" in clock-validate help))
3. ⏭️ **Check:** invite explanation not on the page
4. ⏭️ **Check:** privacy explanation not on the page
5. ⏭️ **Check:** `(() => { const h=[...document.querySelectorAll('h2')].find(e=>e.textContent.includes('Anonymous session')||e.textContent.includes('Connect session')); h.scrollIntoView({block:'center'}); return true; })()` is true
6. ⏭️ Wait 500 ms
7. ⏭️ invites and privacy at 1440
8. ⏭️ **Check:** focus the privacy info icon (keyboard)
9. ⏭️ Wait 1200 ms
10. ⏭️ **Check:** privacy explanation shows in the tooltip
11. ⏭️ privacy tooltip open

**What this does not show**

- Looks only: nothing sent, saved or toggled
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
