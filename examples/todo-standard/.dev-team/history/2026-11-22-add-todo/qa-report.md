# QA report: Add a new todo (QA-2, QA-3)

## Verdict: READY

No blocking or major defects. Three minor observations are listed below, none of which breaks an acceptance criterion.

## What was run
- `npm test` (node --test): **44 tests, 44 pass, 0 fail, 0 cancelled**, finishes in about 0.4 s wall clock. It was run 9 times in a row with no flakes and no hang, so open handles and keep-alive sockets are not a problem.
- Dev tests: 24. QA tests added: 20.
  - `test/qa-api.test.js` is black box (`server.listen(0)`, fetch, raw `node:http` for chunked bodies and a missing Content-Type). It calls `resetTodos()` before each test and runs `closeAllConnections()` followed by `close()` afterwards.
  - `test/qa-page.test.js` serves `GET /` and checks the HTML and script statically.
- There is no build step and no linter in this repo (project standard), so neither was run.
- Live exercise: a throwaway script at `/tmp/qa-run.mjs` (outside the repo) imported the server on a random port. I used curl against it.
  - `GET /` returned 200 text/html.
  - POST of the XSS title `<img src=x onerror=alert(1)>` returned 201, and GET returned the identical raw string.
  - A 5000 byte body returned 413 (the client got a proper response, not a reset).
  - `/?x=1`, `/index.html` and HEAD returned 404.
  - The server stderr was empty, so there were no crashes or unhandled rejections.

## Verified by execution vs by reading
- **Executed:** all API scenarios M1.1 to M1.15 and M3.2. These cover the 400, 413 and 415 table with exact messages, the list unchanged after each error and a GET returning 200 afterwards, 20 concurrent POSTs with unique consecutive ids, emoji/multibyte titles at the limit, chunked body without Content-Length giving 413, a chunked body split mid emoji, and the 1024/1025 byte boundary.
- **Static test (page text, executed):** the M2.1 markup ids, `novalidate`, no `required`, `maxlength=120`, `autocomplete=off`, no HTML injection sinks, `textContent` for titles and errors, the busy guard, and the disabled/finally logic.
- **Verified by reading the code only (no browser available, not executed):** M2.2, M2.3, M2.6, M2.8, M2.9, M3.3, M3.4, S1.3, S1.4. The reasoning:
  - **Empty state:** the list stays empty and the initial fetch failure is swallowed (`.catch(() => {})`), so nothing breaks.
  - **Blank submit:** `Enter a title.` is shown, aria-invalid is set, there is no fetch, and the text and focus are kept.
  - **Double submit:** the `busy` flag returns early synchronously before any await, and the button is disabled and restored in `finally`. This is correct, so only one POST goes out.
  - **Success:** the server todo is appended, the input is cleared, the error is cleared and the input is focused.
  - **Server 4xx or 413:** `body.error` is shown verbatim, with aria-invalid set. The text is kept and the input is focused. A body without an `error` string uses the fallback copy.
  - **Network error or non-JSON reply (including a 500 with an empty body):** the "Could not reach the server..." copy is shown. This matches plan decision 1, and the button is restored.
  - **XSS:** `li.textContent` is used and no sink exists, so `<img>` and `<script>` titles render as literal text. This is the same path for initial load and for add, because both use `renderItem`.
  - A real-browser pass (Enter versus click, focus order, screen-reader announcement of role=alert, a throttled network) is still recommended but is not a blocker.

## Acceptance criteria
| Criterion | Result | Evidence |
|---|---|---|
| M1 create via API (201, trimmed, `done:false`, id max+1, validation, size and type limits, server stays up) | PASS | qa-api tests M1.1 to M1.15 |
| M2 form on the page (markup, no reload, clear and focus, client blank check with no request, errors shown, in-flight guard) | PASS (markup and logic verified statically and by reading; not run in a browser) | qa-page tests and a code review of `web/index.html` |
| M3 titles render as text | PASS | M3.1/M3.5 static, M3.2 API round trip, live curl; DOM rendering verified by reading |
| S1 (maxlength, autocomplete, disabled while busy, double submit guard) | PASS (static and by reading) | qa-page tests |

## Defects
No critical, major or blocking defects.

| # | Sev | Owner | Observation | Repro | Expected vs actual |
|---|---|---|---|---|---|
| 1 | Minor | frontend | On the network-error path the input is not re-focused. The `input.focus()` call at `web/index.html:68` sits inside `try`, so it is skipped when fetch rejects or `res.json()` throws. | Stop the server, submit a title. | The plan says focus returns to the input after every result. Actual: focus stays on the Add button (the button is disabled during the request and then restored). The text is kept and the error is shown, so there is no data loss. Fix: move `input.focus()` into `finally`. |
| 2 | Minor | backend | `GET /` is sent as `Content-Type: text/html` with no charset (`src/server.js`, the `/` branch). The page has `<meta charset="utf-8">`, so browsers decode it correctly. | `curl -i localhost:PORT/` | Expected `text/html; charset=utf-8` as a hardening measure. Pre-existing and harmless. |
| 3 | Info | backend | Exact-match routing means `GET /?x=1` and `/index.html` return 404. This is by design (architecture section 5) and is not a regression. | `curl -i "localhost:PORT/?x=1"` | None. |

## Coverage gaps (accepted)
Cross-browser and visual checks, real DOM execution (there is no jsdom or Playwright and none was introduced), load testing, persistence (non-goal), and the C1 counter (not built).
