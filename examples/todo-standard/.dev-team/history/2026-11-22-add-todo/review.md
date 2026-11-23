# Tech Lead review: Add a new todo (POST /api/todos + form)

Scope reviewed: `git diff` against `35ff058` (`src/server.js`, `web/index.html`), plus the untracked files `src/todos.js`, `test/{todos,server,web,qa-api,qa-page}.test.js` and `.gitignore`.
Checked against `plan.md` (standards, decisions, contract, DoD), `architecture.md` sections 2.2-2.5 and 6, `brief.md` M1-M3/S1 and `qa-report.md`.

## Verdict: APPROVE

There are no blockers and no major findings. The change does what the plan asked, keeps the frozen contract, and follows the repo's terse zero-dependency style. I merged the two QA minors into the suggestions below. They can ship as is or be fixed in a quick follow-up.

## What I ran myself
- `npm test`: 44 tests, 44 pass, 0 fail. Wall time is about 0.4 s and the process exits promptly with no hanging handles.
- Extra probes with throwaway scripts outside the repo, deleted afterwards:
  - **1 MB chunked body, 5 runs:** each returned 413 `{"error":"Request body too large"}`.
  - **Slow chunked senders (20 ms and 10 ms between chunks):** 413.
  - **`Content-Length: 1000000` with a partial body:** an immediate 413.
  - **3 MB chunked body via curl, 3 runs:** 413 each time, never a connection reset.
  - **`Content-Length: abc` / `-1`:** Node's parser rejects these with 400 before our handler runs. No crash.
  - **3 clients aborted mid-body:** the server stayed up and the next GET returned 200. Each abort logs one stack line (see m3).

## Checklist
| Area | Result |
|---|---|
| Contract (architecture section 2.2): order 415 -> 413 -> Invalid JSON -> non-object -> title checks; exact strings; `{error}` shape; `application/json; charset=utf-8` on all JSON responses | OK (`src/server.js:22-33`, `src/todos.js:3-10`) |
| Mass assignment: todo built field by field, id = max+1 or 1 | OK (`src/todos.js:12-17`) |
| XSS: no `innerHTML`/`outerHTML`/`insertAdjacentHTML`; titles and errors set via `textContent`; one `renderItem` for initial load and add | OK (`web/index.html:9-13, 15-19`) |
| Body limit: Content-Length pre-check plus streamed byte count; Buffer decoded once | OK (`src/server.js:11-21`) |
| Crash safety: handler-wide try/catch -> 500, `headersSent` guard, stack only to stderr, titles never logged | OK (`src/server.js:35-44`) |
| CSRF/CORS: JSON-only content type, no CORS headers | OK |
| Frontend: `novalidate`, no `required`, `maxlength=120`, client blank check sends no request, `busy` guard plus disabled button restored in `finally` | OK |
| Tests: `listen(0)`, `closeAllConnections()` + `close()`, `resetTodos()` in `beforeEach`, no timers/sleeps, no flakiness (QA ran 9 times, I ran 1) | OK |
| Scope: M1-M3 + S1 only, C1 counter not built, `package.json` unchanged, zero dependencies | OK |
| Secrets | None found |

## Blockers
None.

## Non-blocking suggestions (minor)
| # | File:line | Owner | Finding | Fix |
|---|---|---|---|---|
| m1 | `web/index.html:68` | frontend-developer | (QA #1) `input.focus()` is inside `try`, so the network-error path (fetch rejects or `res.json()` throws) leaves focus on the button. The plan says focus returns to the input after every result. | Move `input.focus()` into the `finally` block, after the button is restored. |
| m2 | `src/server.js:38` | backend-developer | (QA #2, pre-existing) `GET /` sends `Content-Type: text/html` with no charset. The page has `<meta charset>`, so this is harmless. | Use `'text/html; charset=utf-8'`. This is a one-token change on a line the diff already touches. |
| m3 | `src/server.js:41` | backend-developer | A client abort mid-body (`Error: aborted` from `for await`) goes to the top-level catch. It logs a full stack and tries a 500 on a dead socket. Behaviour is correct and the server stays up, but the log is noisy. | Optional: `if (req.destroyed) return;` before `console.error`, or skip logging when `err.code === 'ECONNRESET'`/message `aborted`. Backlog-level. |
| m4 | `web/index.html:63-66` | frontend-developer | A 500 with a JSON body shows `Internal server error` and sets `aria-invalid="true"`, which marks a server fault as bad input. | Set `aria-invalid` only for `res.status < 500`. This is cosmetic and a11y-only. |
| m5 | `src/server.js:15-19` | backend-developer | On overflow, `readBody` returns from inside `for await`, which destroys `req` **before** the 413 is written. The plan's risk table asked for `res.end()` first. My probes (Node client, curl, 1-3 MB, slow senders) always got a clean 413, so this is not a defect today. It is the subtle spot if 413 flakiness ever shows up. | No change needed now. If it shows up, have `readBody` stop collecting but keep draining, or write the 413 and then `req.resume()`. |
| m6 | `test/server.test.js:73` | backend-developer | The test name says "GET / and GET /api/todos still work", but the test checks `/` and a 404. | Rename to "GET / serves the page; unknown route 404". |
| m7 | `test/qa-page.test.js:214-219` | qa-engineer | Static regexes on implementation details such as `if \(busy\) return` and `btn\.disabled = true` break on harmless refactors. | Acceptable without a DOM runner. If a refactor trips them, relax them to behaviour-level markers. Do not add jsdom. |
| m8 | `.gitignore` | (orchestrator) | New file, not in the plan or in ownership. It ignores `.dev-team/`. | Fine if intended. Confirm before committing. |

Duplication note: `web.test.js` overlaps `qa-page.test.js`, and `server.test.js` overlaps `qa-api.test.js`. Dev and QA tests are independent on purpose, and the suite runs in under 0.5 s, so keep both.

## DoD status
- [x] `npm test` is green and exits promptly.
- [x] Error strings and status codes match architecture section 2.2 exactly.
- [x] No unhandled rejection on any invalid input, and GET works after every error (tested plus probed).
- [x] No HTML sinks and no `required` attribute.
- [x] Zero dependencies, `package.json` unchanged, ESM.
- [x] No secrets, no title logging, no CORS.
- [~] Manual QA-3 in a real browser was verified by reading only, because no browser was available. Before release, do a 2-minute pass: click and Enter, double Enter, the XSS title, server stopped, keyboard only.
- [x] `memory/project.md` updated by the Tech Lead with the POST contract, `src/todos.js` and `resetTodos`.

## Follow-ups for the backlog
1. **Browser pass:** run the QA-3 manual checks in a real browser (above). Optionally add a Playwright smoke test later, but only if the team accepts a dev dependency.
2. **Polish:** m1 + m2 + m4 as one small polish ticket.
3. **Unknown methods:** return 405 with an `Allow` header for unknown methods on `/api/todos` (architecture section 5).
4. **Routing:** match on the path (`new URL(req.url, 'http://x').pathname`) so `/api/todos?x=1` works. Do this only when it is needed.
5. **CSP:** add one with a script hash (architecture section 5, deferred).
6. **Store cap:** limit the number of todos to bound memory (a known DoS-style limit in architecture section 4).
7. **C1 character counter:** still a Could item, not built.
