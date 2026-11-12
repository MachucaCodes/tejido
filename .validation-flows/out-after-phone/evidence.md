**Browser check — List page after phone: PASSED** (7/7 checks, 24/24 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `b75b29aa35` on `clock-ac58e0ba-ui-review-ui-mockup-list-page-opens-on` (with uncommitted changes)
- Environment: PR #5 preview, prod data, read-only — https://tejido-git-clock-02d9bcf8-ui-mockup-e5f195-dane-myers-projects.vercel.app, Chrome 157.0.8103.38 (headless), signed in as Dane (copy of his base VM Chrome), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 390×844, on clock-fsn1
- Ran: 2026-11-12T06:20:41.346Z (15s)

**Steps**

1. ✅ Open /admin/lists/1e22d2d0-e2aa-48f6-bf20-439f3539c5eb (1754 ms)
2. ✅ **Check:** Page shows "Add numbers" (39 ms)
3. ✅ **Check:** `(()=>{const h=document.querySelector("h1");if(h)h.textContent="Example list";const hp=document.querySelectorAll("header p.text-sm");if(hp.length>1)hp[0].textContent="Neighbours for the March session";document.querySelectorAll("main li p.truncate, section li p.truncate").forEach((e,i)=>e.textContent="Member "+(i+1));document.querySelectorAll("section li .font-mono").forEach(e=>e.textContent="+506 0000 0000");return true})()` is true (6 ms)
4. ✅ after 1440 (0 ms)
5. ✅ Click "Add numbers" (53 ms)
6. ✅ **Check:** Page shows "Or paste numbers" (8 ms)
7. ✅ add dialog (0 ms)
8. ✅ Click `[aria-label='How to paste numbers']` (39 ms)
9. ✅ Wait 500 ms (506 ms)
10. ✅ info clicked desktop (0 ms)
11. ✅ Press Escape (10 ms)
12. ✅ Press Escape (3 ms)
13. ✅ Wait 400 ms (404 ms)
14. ✅ Click "Edit" (31 ms)
15. ✅ **Check:** Page shows "Edit list" (6 ms)
16. ✅ **Check:** `(()=>{document.querySelector('#list-name').value='Example list';document.querySelector('#list-description').value='Neighbours for the March session';return true})()` is true (3 ms)
17. ✅ edit dialog (0 ms)
18. ✅ Click `[aria-label='Delete list']` (36 ms)
19. ✅ **Check:** Page shows "Its numbers are kept" (11 ms)
20. ✅ **Check:** `(()=>{const t=[...document.querySelectorAll('[data-slot=dialog-title]')].pop();if(t)t.textContent='Delete “Example list”?';return true})()` is true (5 ms)
21. ✅ delete confirm (0 ms)
22. ✅ Click "Cancel" (25 ms)
23. ✅ Wait 300 ms (303 ms)
24. ✅ after cancel (0 ms)

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
