# Release: Add a new todo (POST /api/todos + form)

## What changes
- `POST /api/todos` (JSON `{title}`): 201 on success; 400, 413 (body over 1024 bytes) and 415 (wrong Content-Type) return `{error}`; 500 returns `{"error":"Internal server error"}`.
- `web/index.html`: add form; titles rendered with `textContent` (no stored XSS).
- New `src/todos.js` (in-memory store), modified `src/server.js`, new tests in `test/`, new `.gitignore` (ignores `.dev-team/`; confirm that is intended).
- No new dependencies, env vars, ports (still :3000), CI or infra. `package.json` is unchanged.

## Pre-release checklist
- [ ] `npm test` is green (44/44 at review).
- [ ] Confirm `.gitignore` is intended before committing.
- [ ] Manual 2-minute browser check (outstanding from review; QA could not run a browser). Run `npm start`, open http://localhost:3000, then check:
  - add by click and by Enter: no reload, input clears
  - double Enter: only one item is created
  - blank submit: shows "Enter a title." and sends no request (Network tab)
  - title `<img src=x onerror=alert(1)>` shows as literal text, both on add and after reload
  - stop the server, then submit: shows the network error message
  - keyboard-only flow works
- [ ] Optional minor polish (non-blocking): m1 focus in `finally`, m2 `text/html; charset=utf-8`, m4 `aria-invalid` only for status below 500.

## Run
- `npm start` serves on :3000 (Node 22).
- `npm test` runs the suite.

## Smoke tests (server on :3000)
```sh
curl -i localhost:3000/api/todos                                   # 200, JSON list
curl -i -X POST localhost:3000/api/todos -H 'Content-Type: application/json' \
  -d '{"title":"  Buy milk  "}'                                     # 201 {"id":N,"title":"Buy milk","done":false}
curl -i -X POST localhost:3000/api/todos -H 'Content-Type: application/json' \
  -d '{"title":"   "}'                                              # 400 {"error":...}
curl -i -X POST localhost:3000/api/todos -H 'Content-Type: application/json' \
  --data "{\"title\":\"$(head -c 2000 /dev/zero | tr '\0' a)\"}"    # 413 {"error":"Request body too large"}
curl -i localhost:3000/api/todos                                   # still 200, includes "Buy milk"
```

## Monitor
- No metrics or log pipeline exist. Watch the process stderr.
- Any `console.error` stack trace means a 500 (unexpected). Investigate every one.
- One stack line per client abort mid-body is known noise (review m3). It is not an incident.
- Process exits or restarts. Memory growth, since the store is uncapped (known limit, backlog item 6).

## Rollback
- Revert the commit and restart (`npm start`). There is no data migration.
- In-memory todos are lost on every restart anyway, so rollback has no data impact.

## Risks and manual steps
- Browser behaviour was verified by reading the code only, so the manual check above is the gate.
- No auth or persistence (non-goals). Anyone who can reach the port can add todos, and the store has no size cap.
