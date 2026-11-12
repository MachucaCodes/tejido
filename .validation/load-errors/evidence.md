**Browser check — Failed loads show one alert line (local mock): PASSED** (6/6 checks, 12/12 steps)

- Kind: continuous browser recording (Playwright video + trace) of an automated run, not a hand-made demo
- Commit: `14f93c37e6` on `clock-b05f7733-ui-fix-list-page-has-a-lists-back-link` (with uncommitted changes)
- Environment: next dev of this branch on the VM; admin guard stubbed and Supabase pointed at a local fake API that returns one made-up session and fails every other query. No real data. — http://localhost:4180, Chrome 157.0.8103.38 (headless), 1440×900, on clock-fsn1
- Ran: 2026-11-12T07:38:09.982Z (23s)

**Steps**

1. ✅ Open /admin/sessions/fake-session (938 ms)
2. ✅ **Check:** Page shows "Couldn't load this session" (27 ms)
3. ✅ **Check:** Page does not show "No themes yet" (3047 ms)
4. ✅ Overview: queries fail, alert instead of 0 opened / No themes yet (0 ms)
5. ✅ Open /admin/sessions/fake-session/synthesis (273 ms)
6. ✅ **Check:** Page shows "Couldn't load the summaries" (22 ms)
7. ✅ **Check:** Page does not show "No summary yet" (3048 ms)
8. ✅ Synthesis: alert instead of No summary yet (0 ms)
9. ✅ Open /admin/sessions/fake-session/logs (1297 ms)
10. ✅ **Check:** Page shows "Couldn't load the logs" (22 ms)
11. ✅ **Check:** Page does not show "simulated failure" (3037 ms)
12. ✅ Logs: alert instead of the raw error message (0 ms)

**What this does not show**

- Local mock, not the preview: a real failed query can't be forced on the preview
- A browser recording shows what the page displayed; it does not prove back-end or security rules on its own.
