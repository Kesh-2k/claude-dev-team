# Plan: Add a new todo (POST /api/todos + form)

Inputs: `brief.md`, `ux.md`, `architecture.md`, `memory/project.md`. No `memory/decisions.md` exists yet.
Roles used: backend-developer, frontend-developer, qa-engineer. There is no data, mobile or devops work (devops writes `release.md` later).

## 1. Standards (follow these, do not invent new ones)
- **Runtime:** Node 22, ESM (`"type": "module"`), **zero dependencies**. Do not change `package.json`. No new scripts, no build step.
- **Imports:** use the `node:` prefix (`node:http`, `node:fs/promises`, `node:test`, `node:assert/strict`).
- **Style:** match `src/server.js`. That means terse code, 2-space indent, single quotes, semicolons, named exports (`export const` / `export function`), and short helper functions. Early `return res.end(...)` in the router is fine. There is no lint or format tool in the repo, so do not add one. Keep lines readable and do not reformat code you did not change.
- **Routing:** keep the exact-match `if`-chain on `req.url` + `req.method`. Do not add URL parsing (architecture section 5).
- **Tests:** `node --test` with `node:test` + `node:assert/strict` + global `fetch`. Files are `test/*.test.js`. HTTP tests use `server.listen(0)` in `before`, and `server.closeAllConnections(); server.close()` in `after`. Call `resetTodos()` in `beforeEach`.
- **Naming:** camelCase functions, `MAX_TITLE` style for constants. Use the error strings from architecture section 2.2 **verbatim**.
- **Frontend:** a single `web/index.html` with an inline `<script>`. No CSS file, no `<style>` block. Only the inline styles allowed by ux.md section 7 may be used. No `innerHTML`, `outerHTML` or `insertAdjacentHTML` anywhere in the file.
- **Logging:** only `console.error(err.stack)` in the top-level catch. Never log titles.

## 2. Decisions made by the Tech Lead (these settle differences between the docs)
1. **Client validation vs `required`:** the input has **no `required` attribute**, and the form also has `novalidate`. This is belt and braces, so no browser bubble can ever show. The page script trims the value. If it is empty, the script shows `Enter a title.` in `#error`, sets `aria-invalid="true"`, focuses the input, keeps the text and **sends no request**. Over-length input is blocked by `maxlength="120"`. The server still enforces every rule, and any 4xx `error` string is shown verbatim. This overrides the `required` bullet in ux.md section 3.
2. **Markup ids:** use the ux.md contract, not the shorter architecture sketch: `form#add-form`, `label[for=title]` with the text "New todo", `input#title` (name=title, type=text, maxlength=120, autocomplete=off, aria-describedby=error), `button#add-btn` (type=submit), `p#error` (role=alert, always present), `ul#list`. QA tests rely on these ids.
3. **Status codes:** keep architecture ADR-2. That means 415 for a wrong or missing Content-Type, 413 for bodies over 1024 bytes, and 400 for everything else in the table. All of them return the `{error}` JSON shape. This goes beyond the brief's "400 for invalid input", but no acceptance criterion breaks, because every invalid-*content* case is still 400.
4. **Server error wording:** use the architecture strings (for example `title must be at most 120 characters`), not the example wording in ux.md section 8. The page shows them verbatim.
5. **HTTP test file name:** `test/server.test.js`, not `test/api.test.js` as architecture section 7 says. It mirrors `src/server.js`.
6. **Scope:** Must M1-M3 plus Should S1 (it is nearly free in the same file). Could C1 (character counter) is **not** done.

## 3. API contract (frozen; frontend codes against this)
Architecture section 2.2 is the single source of truth. Summary:
- `POST /api/todos` with `Content-Type: application/json` and body `{"title": string}`.
- 201 returns `{id, title (trimmed), done:false}`.
- 400, 413 and 415 return `{"error": "<message>"}`.
- An unexpected failure returns 500 `{"error":"Internal server error"}`.
- Every JSON response has `Content-Type: application/json; charset=utf-8`.
- `GET /api/todos` returns the list. It keeps its current shape.

## 4. Tasks

### backend-developer
**BE-1 Domain module `src/todos.js`** (S). Covers M1 (validation, ids, ignoring `id`/`done`).
- Exports `MAX_TITLE`, `validateTitle(input)`, `listTodos()`, `addTodo(title)` and `resetTodos(seed?)`, as in architecture section 2.1. Validation checks 5-8 run in order and use the exact messages. The id is `max+1`, or 1 when the list is empty. `addTodo` builds `{ id, title, done: false }` explicitly.
- Unit tests in `test/todos.test.js`:
  - trimming
  - 120 characters passes, 121 fails
  - `""`, `"   "`, `undefined`, `123`, `null` and `{}` each give the exact message
  - an empty list gives id 1
  - a list seeded with ids [1,5] gives id 6
- Owns: `src/todos.js`, `test/todos.test.js`.

**BE-2 POST route in `src/server.js`** (M). Depends on BE-1. Covers M1.
- Add the `sendJson`, `readBody(req, 1024)`, POST branch and handler-wide try/catch → 500, as in architecture sections 2.2-2.3.
- Check order: 415 → 413 (Content-Length first, then the streamed byte count; send `Connection: close` and call `res.end()` before any destroy) → 400 Invalid JSON (empty or unparsable body) → 400 non-object (`null`, array or primitive) → `validateTitle` → `addTodo` → 201.
- GET uses `listTodos()` and `sendJson`.
- Remove the local `todos` array. Optionally add `X-Content-Type-Options: nosniff`.
- HTTP tests in `test/server.test.js`:
  - 201 with the right shape, then GET includes the new todo
  - `id`/`done` in the body are ignored
  - every 400 case returns its exact message **and** leaves the list unchanged
  - empty body, `{"title":`, `[]`, `null`
  - a `text/plain` Content-Type returns 415
  - `application/json; charset=utf-8` is accepted
  - a 2 KB body returns 413
  - a final GET returns 200 (shows the server did not crash)
- Owns: `src/server.js`, `test/server.test.js`.

### frontend-developer
**FE-1 Add form plus safe rendering in `web/index.html`** (M). No code dependency, because it works against the frozen contract in section 3. Covers M2, M3 and S1.
- Markup as in section 2, decision 2. Place it directly under `h1` and above `ul#list`.
- One `renderItem(todo)` function (`createElement('li')` + `textContent`). It is used for both the initial load and new items. Remove `innerHTML`.
- The submit handler does the following:
  - call `preventDefault`
  - return early if a request is already in flight
  - clear `#error` and `aria-invalid`
  - check for a trim-empty title, which gives `Enter a title.` and sends no request
  - disable the button and set its text to `Adding...`
  - `fetch` POST with a JSON header
- How each response is handled:
  - **201:** append the server's todo, clear the input and the error, and focus the input.
  - **Any non-OK response:** show `body.error`, or `Could not add the todo. Try again.` when it is missing. Set `aria-invalid`, keep the text and focus the input.
  - **Fetch rejects or the JSON cannot be parsed:** show `Could not reach the server. Check your connection and try again.` Do not set `aria-invalid`.
  - **In `finally`:** restore the button.
- On `input` events, remove `aria-invalid`. All error text is set via `textContent`.
- Cheap static test in `test/web.test.js`. It reads the file as text and asserts:
  - no `innerHTML`, `outerHTML` or `insertAdjacentHTML`
  - contains `textContent`
  - has `id="title"` with `maxlength="120"`
  - has `id="add-form"`, `id="add-btn"` and `id="error"` with `role="alert"`
  - has no `required` attribute
- Owns: `web/index.html`, `test/web.test.js`.

### qa-engineer
**QA-1 Test plan** (S). Can start immediately. Write `.dev-team/test-plan.md`, which maps every M1-M3 acceptance criterion (and S1) to an automated or manual check.

**QA-2 Independent tests** (M). Write these after BE-2 merges. They are black-box tests in `test/qa-*.test.js`, for example `test/qa-api.test.js` and `test/qa-page.test.js`. They cover:
- the full brief acceptance criteria end to end
- the server staying up after each error
- concurrent POSTs giving unique ids
- a multibyte/emoji title at the length limit
- a chunked body with no Content-Length over 1 KB giving 413
- `GET /` serving a page that has the form ids and no `innerHTML`
- an XSS payload stored through the API, then returned as a raw string by GET

**QA-3 Manual browser check** (S). Do this after FE-1 + BE-2, with `npm start`. Check:
- add with a click and with Enter, no reload, the input clears
- blank submit shows `Enter a title.` and sends no request (check the Network tab)
- the XSS title `<img src=x onerror=alert(1)>` renders as literal text, both after a reload and on add
- a double Enter creates one item
- the server stopped gives the network error message
- keyboard-only flow and `role=alert` announcement

Record the results in `.dev-team/qa-report.md`.
- Owns: `test/qa-*.test.js`, `.dev-team/test-plan.md`, `.dev-team/qa-report.md`.

## 5. Order and parallelism
```
t0:  BE-1 ──> BE-2           (backend, sequential: BE-2 imports todos.js)
t0:  FE-1                    (frontend, in parallel with BE-1/BE-2, against the frozen contract)
t0:  QA-1                    (in parallel)
after BE-2:        QA-2
after BE-2+FE-1:   QA-3 (integration/manual), then Tech Lead review
```
- Backend and frontend run **in parallel**. The only coupling point is the contract in section 3, and neither side may change it alone. If a change is needed, escalate to the Tech Lead.
- Until BE-2 lands, FE can try the page against the current server. Only GET works then, and POST returns 404, which takes the fallback-message path.

## 6. Ownership (mirrors `ownership.json`; patterns are disjoint)
| Role | Files |
|---|---|
| backend-developer | `src/**`, `test/todos.test.js`, `test/server.test.js` |
| frontend-developer | `web/**`, `test/web.test.js` |
| qa-engineer | `test/qa-*.test.js`, `.dev-team/test-plan.md`, `.dev-team/qa-report.md` |

No one edits `package.json`. If a change there seems necessary, escalate to the Tech Lead.

## 7. Definition of Done
- [ ] `npm test` passes with 0 failures and exits promptly (no hanging handles).
- [ ] `npm start` serves the page on :3000. Manual QA-3 passes.
- [ ] All M1-M3 acceptance criteria are met and traced in `test-plan.md` / `qa-report.md`. S1 is done.
- [ ] Error strings and status codes match architecture section 2.2 exactly.
- [ ] No uncaught exception or unhandled rejection on any invalid input. GET works after every error case.
- [ ] `web/index.html` contains no `innerHTML`, `outerHTML` or `insertAdjacentHTML`, and no `required` attribute.
- [ ] Zero dependencies. `package.json` is unchanged. ESM only. Code follows the section 1 standards.
- [ ] No secrets, no logging of titles, no CORS headers.
- [ ] `memory/project.md` is updated by the Tech Lead at review time. It should record the POST contract, `src/todos.js` and `resetTodos` for tests.

## 8. Risks and de-risking
| Risk | Mitigation |
|---|---|
| The async handler throws, causing an unhandled rejection that kills the process (Node 22) | Wrap the whole handler in try/catch → 500. QA-2 checks GET after every error case. |
| The 413 path resets the socket instead of sending the response, so tests become flaky | Write the response and call `res.end()` before any `req.destroy()`, and set `Connection: close`. BE-2 tests both the Content-Length path and the chunked path (QA-2). |
| Tests hang on keep-alive sockets | Call `server.closeAllConnections()` before `close()` in every HTTP test file. |
| Shared singleton store makes tests depend on their order | Call `resetTodos()` in `beforeEach`. `node --test` isolates each file in its own process. |
| FE and BE drift on the contract | The contract is frozen (section 3). QA-3 is the integration gate. |
| Double submit via fast Enter | The handler has an in-flight guard, not just a disabled button. QA-3 checks it manually. |
| Multibyte chars and length counting | Both client and server count UTF-16 `.length`. Decode the full Buffer once. QA-2 checks a title at the limit. |
