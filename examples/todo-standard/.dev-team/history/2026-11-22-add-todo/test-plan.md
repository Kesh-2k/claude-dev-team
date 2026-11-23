# Test plan: Add a new todo (QA-1)

Sources: brief.md (M1-M3, S1), ux.md, architecture.md section 2.2 (error table, authoritative), plan.md.
Levels: **API** = `test/qa-api.test.js` (black box: `server.listen(0)` + fetch, raw `node:http`/`net` where fetch cannot do it). **PAGE** = `test/qa-page.test.js` (static: read `web/index.html` or `GET /`). **MAN** = manual browser check with `npm start` (QA-3). Dev-owned unit tests (`todos.test.js`, `server.test.js`, `web.test.js`) are not duplicated, QA tests stay independent and assert only the frozen contract. Each API test calls `resetTodos()` (or uses a fresh server) so ids are predictable.

## M1 Create via API
| # | Scenario | Expected | Level |
|---|---|---|---|
| M1.1 | POST `{"title":"  Buy milk  "}` | 201, `application/json; charset=utf-8`, body exactly `{id, title:"Buy milk", done:false}` | API |
| M1.2 | GET after POST | list contains the new todo; seed todo still there | API |
| M1.3 | Seed ids 1 and 5 (via `resetTodos(seed)`), POST | new id 6 | API |
| M1.3b | Empty list, POST | id 1 | API |
| M1.3c | Body `{"title":"x","id":999}` | id is max+1, not 999 (id = max+1 edge) | API |
| M1.4 | Title of exactly 120 ASCII chars | 201; stored length 120 | API |
| M1.4b | 121 chars | 400 `title must be at most 120 characters`; list unchanged | API |
| M1.4c | `"  " + 120 chars + "  "` (trimmed length 120) | 201 (limit applies after trim) | API |
| M1.4d | 60 emoji (each 2 UTF-16 units = 120) | 201; GET returns identical string, not split | API |
| M1.4e | 61 emoji (122 units) | 400 (documents the UTF-16 unit rule) | API |
| M1.4f | 119 "é" + one "é" (multibyte, 120 chars, 240 bytes) | 201; round trips intact | API |
| M1.5a | Title `""`, `"   "`, `"\t\n"`, NBSP-only | 400 `title must not be empty`; list unchanged | API |
| M1.5b | `{}` | 400 `title is required` | API |
| M1.5c | `{"title":123}`, `null`, `true`, `{}`, `[]` | 400 `title must be a string` | API |
| M1.6a | Malformed `{"title":`; plain text `hello` | 400 `Invalid JSON`; server up | API |
| M1.6b | Empty body | 400 `Invalid JSON` | API |
| M1.6c | Valid JSON but not object: `[]`, `null`, `"x"`, `5` | 400 `Body must be a JSON object` | API |
| M1.7 | Body `{"title":"a","id":99,"done":true,"extra":1}` | 201, `done:false`, server id, no `extra` key in response or GET | API |
| M1.8 | Missing Content-Type (raw http, no header) | 415 `Content-Type must be application/json` | API |
| M1.8b | `text/plain`, `application/x-www-form-urlencoded`; `APPLICATION/JSON; charset=utf-8` | first two 415; third 201 | API |
| M1.9a | Body over 1 KB with Content-Length (e.g. 2000 B valid JSON) | 413 `Request body too large`; client receives response, not a reset | API |
| M1.9b | Over 1 KB, chunked, no Content-Length (raw `http.request` with `Transfer-Encoding: chunked`) | 413 | API |
| M1.9c | Exactly 1024 B body vs 1025 B (whitespace-padded valid JSON) | 201 vs 413 (boundary) | API |
| M1.9d | Multibyte body where chars < 1024 but bytes > 1024 | 413 (limit is bytes) | API |
| M1.10 | Check order: wrong Content-Type plus oversize body | 415 wins (table order) | API |
| M1.11 | After each error class above, GET /api/todos | 200 and a valid array (no crash, store unchanged, same length) | API |
| M1.12 | Rapid double POST: `Promise.all` of 2, then 20 concurrent, same title | all 201, ids unique and consecutive, GET length matches | API |
| M1.13 | Chunked body split mid multibyte char (send emoji bytes in separate chunks) | 201, title intact | API |
| M1.14 | Unsupported: `PUT/DELETE /api/todos`, `POST /api/unknown`, `GET /nope` | not 500, not crash (record actual status; expect 404/405) | API |
| M1.15 | GET `/api/todos` shape and header unchanged | 200, array of `{id,title,done}` | API |
| M1.16 | `npm test` run exits promptly | `node --test` finishes (no hang from open server/keep-alive); time it, flag if >10 s | API (run) |

## M2 Form on the page
| # | Scenario | Expected | Level |
|---|---|---|---|
| M2.1 | `GET /` returns 200 HTML containing `form#add-form`, `label[for=title]` "New todo", `input#title`, `button#add-btn` type=submit, `p#error[role=alert]`, `ul#list` | all present, `p#error` in DOM on load | PAGE |
| M2.2 | Type valid title, click Add | li appended, no reload (check page state/network), input cleared, focus on input | MAN |
| M2.3 | Press Enter in input | same as M2.2 | MAN |
| M2.4 | Blank/whitespace submit | `Enter a title.` shown, aria-invalid=true, NO POST in Network tab, text kept, no browser bubble | MAN + PAGE (script contains the string, form has `novalidate`, input has no `required`) |
| M2.5 | Server error (stop server mid-session / force 400) | server `error` shown verbatim or network copy `Could not reach the server. Check your connection and try again.`; list unchanged; typed text kept; button re-enabled | MAN |
| M2.6 | Error, then successful add | error cleared, aria-invalid removed | MAN |
| M2.7 | Page script handles non-JSON/500 reply | fallback `Could not add the todo. Try again.` (simulate with devtools override or kill server) | MAN |
| M2.8 | Keyboard only: Tab order input, button; focus returns to input after result; error announced (role=alert) | pass | MAN |
| M2.9 | Initial load lists existing todos; empty-list state does not break | pass | MAN |

## M3 Titles render as text
| # | Scenario | Expected | Level |
|---|---|---|---|
| M3.1 | `web/index.html` script has no `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write` (strip comments first) and uses `textContent` for titles | pass | PAGE |
| M3.2 | POST `<script>alert(1)</script>` and `<img src=x onerror=alert(1)>`; GET returns the raw strings (not escaped/altered, 201) | strings identical | API |
| M3.3 | Same titles in the browser: after reload and on add show literal text, no `img` element in `ul#list`, no alert dialog, `li.children.length==0` | pass | MAN |
| M3.4 | Titles with `& < > " '` and `</li>` | shown literally | MAN |
| M3.5 | Error text from server is set with `textContent` too (title echoed in no error) | PAGE static check | PAGE |

## S1
| # | Scenario | Expected | Level |
|---|---|---|---|
| S1.1 | `input#title` has `maxlength="120"`, label or placeholder present, `autocomplete=off` | pass | PAGE |
| S1.2 | Button disabled while request in flight (e.g. `disabled` set in script before fetch and reset in `finally`); text `Adding...` | PAGE static + MAN with throttled network | PAGE + MAN |
| S1.3 | Rapid double Enter / double click | exactly one todo created (GET length +1) | MAN (API M1.12 covers server side) |
| S1.4 | Paste 200 chars | truncated at 120 by browser | MAN |

## Regression areas
- GET /api/todos and static `GET /` / `index.html` serving (content type, path handling, 404 for others).
- `server.js` still exports `server` and only listens when run directly; tests can `listen(0)`.
- Initial list render after the `innerHTML` removal (seed todo still visible).
- Server survives every error path (no unhandled rejection, no 500 for client mistakes); 413 path does not reset the socket.
- Test process exit: no leaked listeners/keep-alive sockets (`closeAllConnections` in `after`).

## Not covered (accepted)
Cross-browser, visual/contrast audit beyond default styling, persistence (non-goal), load tests, C1 counter (not built).

## Exit criteria
All M1-M3/S1 rows pass; zero 5xx on client input; `npm test` green and exits promptly; any defect reported to the owning role (BE: `src/**`, FE: `web/**`), QA does not edit product code.
