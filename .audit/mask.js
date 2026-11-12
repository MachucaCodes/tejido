(() => { const m = s => s.replace(/[^\s]/g,'▇').slice(0,60);
 document.querySelectorAll('ul.list-disc li, article p.whitespace-pre-wrap, span.font-mono, li .text-xs.text-muted-foreground.ml-2, textarea, pre').forEach(e=>{ if(e.tagName==='TEXTAREA'){e.value=m(e.value);} else e.textContent=m(e.textContent)});
 document.querySelectorAll('a.font-mono').forEach(e=>e.textContent='participant-id');
 return 'ok'; })()
