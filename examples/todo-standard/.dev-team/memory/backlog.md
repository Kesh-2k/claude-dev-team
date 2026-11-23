# Backlog (newest first)
- [risk] Real-browser check of the add-todo form never executed (QA verified by code reading) - do before release.
- [fix] web/index.html: network-error path skips input refocus - move `input.focus()` into `finally`.
- [fix] server.js: GET / Content-Type lacks `charset=utf-8` (pre-existing).
- [polish] Server 500 marks input aria-invalid; client abort mid-upload logs a full stack trace; test name at test/server.test.js:73 misleading; some qa-page tests match exact code text (brittle).
- [should/could] 405 for unsupported methods; route on URL pathname (query strings 404 today); Content-Security-Policy; cap on number of todos; character counter (C1).
- [won't, this run] edit/delete/toggle done, persistence.
