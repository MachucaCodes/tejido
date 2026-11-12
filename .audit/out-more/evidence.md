**Browser check — more: FAILED** (15/17 checks, 31/34 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `a0ba74c90b` on `clock-ca7acf11-ui-audit-cold-audit-of-the-sessions` (with uncommitted changes)
- Environment: production, read-only — https://tejido-zeta.vercel.app, Chrome 157.0.8103.38 (headless), app signed in as Dane (dane+clock-owner@danemyers.com, a session made for this run and signed out after), 1440×900, on clock-fsn1
- Ran: 2026-11-12T03:50:34.717Z (55.2s)

**Steps**

1. ✅ Open /admin/sessions (1140 ms)
2. ✅ **Check:** Page shows "Sessions" (98 ms)
3. ✅ **Check:** `(()=>{document.querySelectorAll('body *').forEach(e=>{if(e.children.length===0&&/^taylor$/i.test(e.textContent.trim()))e.textContent='ADMIN'});return 'ok'})()` is "ok" (30 ms)
4. ✅ list-masked (0 ms)
5. ✅ Open /admin/sessions/evolving-why-statement (2211 ms)
6. ✅ **Check:** Page shows "Synthesis history" (163 ms)
7. ✅ **Check:** `(() => { const m = s => s.replace(/[^\s]/g,'▇').slice(0,60);
 document.querySelectorAll('ul.list-disc li, article p.whitespace-pre-wrap, span.font-mono, li .text-xs.text-muted-foreground.ml-2, textarea, pre').forEach(e=>{ if(e.tagName==='TEXTAREA'){e.value=m(e.value);} else e.textContent=m(e.textContent)});
 document.querySelectorAll('a.font-mono').forEach(e=>e.textContent='participant-id');
 return 'ok'; })()
` is "ok" (66 ms)
8. ✅ **Check:** `(()=>{document.querySelectorAll('body *').forEach(e=>{if(e.children.length===0&&/^taylor$/i.test(e.textContent.trim()))e.textContent='ADMIN'});return 'ok'})()` is "ok" (28 ms)
9. ✅ **Check:** `(document.querySelectorAll('h2').forEach(h=>{if(/^Archive session$/.test(h.textContent))h.closest('section').scrollIntoView({block:'center'})}),'ok')` is "ok" (61 ms)
10. ✅ Wait 300 ms (329 ms)
11. ✅ detail-archive (0 ms)
12. ✅ **Check:** `(document.querySelectorAll('h2').forEach(h=>{if(/^Voices$/.test(h.textContent))h.scrollIntoView({block:'start'})}),window.scrollBy(0,-80),'ok')` is "ok" (27 ms)
13. ✅ Wait 300 ms (317 ms)
14. ✅ detail-voices-themes (0 ms)
15. ✅ Open /admin/sessions/daily-life-together (1391 ms)
16. ✅ **Check:** Page shows "Synthesis history" (112 ms)
17. ✅ **Check:** `(() => { const m = s => s.replace(/[^\s]/g,'▇').slice(0,60);
 document.querySelectorAll('ul.list-disc li, article p.whitespace-pre-wrap, span.font-mono, li .text-xs.text-muted-foreground.ml-2, textarea, pre').forEach(e=>{ if(e.tagName==='TEXTAREA'){e.value=m(e.value);} else e.textContent=m(e.textContent)});
 document.querySelectorAll('a.font-mono').forEach(e=>e.textContent='participant-id');
 return 'ok'; })()
` is "ok" (40 ms)
18. ✅ **Check:** `(()=>{document.querySelectorAll('body *').forEach(e=>{if(e.children.length===0&&/^taylor$/i.test(e.textContent.trim()))e.textContent='ADMIN'});return 'ok'})()` is "ok" (35 ms)
19. ✅ Press End (52 ms)
20. ✅ Wait 400 ms (412 ms)
21. ✅ detail-empty-bottom (0 ms)
22. ✅ Open /admin/sessions/daily-life-together/synthesis (1036 ms)
23. ✅ **Check:** Page shows "Synthesis history" (52 ms)
24. ✅ **Check:** `(()=>{document.querySelectorAll('body *').forEach(e=>{if(e.children.length===0&&/^taylor$/i.test(e.textContent.trim()))e.textContent='ADMIN'});return 'ok'})()` is "ok" (33 ms)
25. ✅ synth-empty (0 ms)
26. ✅ Open /admin/sessions/why-statement-v2 (1630 ms)
27. ✅ **Check:** Page shows "Synthesis history" (87 ms)
28. ✅ **Check:** `(() => { const m = s => s.replace(/[^\s]/g,'▇').slice(0,60);
 document.querySelectorAll('ul.list-disc li, article p.whitespace-pre-wrap, span.font-mono, li .text-xs.text-muted-foreground.ml-2, textarea, pre').forEach(e=>{ if(e.tagName==='TEXTAREA'){e.value=m(e.value);} else e.textContent=m(e.textContent)});
 document.querySelectorAll('a.font-mono').forEach(e=>e.textContent='participant-id');
 return 'ok'; })()
` is "ok" (47 ms)
29. ✅ **Check:** `(()=>{document.querySelectorAll('body *').forEach(e=>{if(e.children.length===0&&/^taylor$/i.test(e.textContent.trim()))e.textContent='ADMIN'});return 'ok'})()` is "ok" (9 ms)
30. ✅ detail-archived-top (0 ms)
31. ✅ Open /admin/sessions/frontlandpurchase/synthesis (1065 ms)
32. ❌ **Check:** synth big TTFB ms (10206 ms)
   - got "11"
33. ⏭️ Open /admin/sessions/frontlandpurchase
34. ⏭️ **Check:** detail big TTFB ms

**What this does not show**

- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
