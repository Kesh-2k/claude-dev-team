# Project: todo-mini
- Stack: Node 22, ESM ("type": "module"), zero dependencies. Raw `node:http` server in `src/server.js`, single static page `web/index.html` (inline script, no build).
- Server exports `server` (http.Server) and only listens on :3000 when run directly -> tests can `server.listen(0)` and use fetch.
- Data: in-memory store in `src/todos.js` (lost on restart). Shape `{id, title, done}`. API: `validateTitle`, `listTodos`, `addTodo`, `resetTodos(seed?)`, `MAX_TITLE=120`. Server must go through these functions, never touch the array.
- Commands: `npm start` (http://localhost:3000), `npm test` (= `node --test`, picks up `test/**/*.test.js`).
- Routing is an if-chain on `req.url` + `req.method`; unknown routes -> 404 empty body.
- API: `GET /api/todos` -> list. `POST /api/todos` (Content-Type application/json, body `{title}`) -> 201 `{id,title(trimmed),done:false}`; errors `{error}` with 415 (content type), 413 (>1024 bytes), 400 (Invalid JSON / Body must be a JSON object / title is required / must be a string / must not be empty / must be at most 120 characters), 500 generic. JSON responses use `application/json; charset=utf-8`. Contract source: `.dev-team/architecture.md` section 2.2.
- Tests: HTTP tests import `server`, `listen(0)` in `before`, `closeAllConnections(); close()` in `after`, `resetTodos()` in `beforeEach`. Files `test/*.test.js` (`qa-*` = QA-owned).
- Security: web/index.html must never use innerHTML/outerHTML/insertAdjacentHTML (enforced by tests) - render via `textContent`.
