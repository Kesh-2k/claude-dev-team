# Brief: Add a new todo

## 1. Problem
Users can only view a hard-coded todo list (GET /api/todos and a static page). They cannot create todos, so the app has no real use. Evidence: `src/server.js` has only GET /api/todos; `web/index.html` has no form. Also, the page renders titles with `innerHTML`, which becomes stored XSS once titles are user input.

## 2. Users & stakeholders
- End user: wants to add a task quickly from the page.
- API client / test author: wants a predictable POST contract.
- Maintainer: wants a small change that fits the zero-dependency, raw `node:http` setup.

## 3. Goals / non-goals
Goals
- A user can add a todo from the page and see it in the list without a reload.
- POST /api/todos validates input and returns clear, consistent errors.
- No stored XSS via titles.

Non-goals (Won't): edit, delete, toggle done, persistence (in-memory only, lost on restart), auth, pagination, duplicate detection.

## 4. Assumptions (decided, no questions asked)
- Title is trimmed. Valid means non-empty after trim and at most 120 characters after trim.
- The server assigns `id` (max existing id + 1, or 1 if the list is empty) and `done: false`. The client cannot set them. Other body fields are ignored.
- Success returns 201 with the created todo as JSON.
- Invalid input returns 400 with JSON `{"error": "<message>"}`. This covers malformed JSON, a missing or non-string title, an empty or whitespace-only title, and a title over 120 characters.
- Responses use `Content-Type: application/json`.

## 5. Backlog

### Must
**M1. Create a todo through the API**
As an API client, I want POST /api/todos so that I can add a todo.
- Given the server is running, when I POST `{"title":"  Buy milk  "}`, then I get 201 and a body `{id, title:"Buy milk", done:false}`.
- Given a todo was created, when I GET /api/todos, then the list includes it.
- Given existing ids 1 and 5, when I POST a valid todo, then the new id is 6.
- Given a title of exactly 120 characters, then I get 201. Given 121 characters, then I get 400.
- Given a title that is whitespace only, empty, missing, or not a string (for example a number), then I get 400 and `{error: <non-empty string>}`, and the list is unchanged.
- Given a malformed JSON body or an empty body, then I get 400 and `{error}`, and the server does not crash.
- Given a body that includes `id` or `done`, then they are ignored and the server-assigned values are used.

**M2. Add form on the page**
As a user, I want a text input and an Add button so that I can add a todo without leaving the page.
- Given the page is loaded, then I see a text input and an Add button above or below the list.
- Given I type a valid title and click Add (or press Enter), then the new todo appears in the list without a reload, and the input is cleared.
- Given I submit an empty or too-long title, or the server returns an error, then the `error` message is shown inline near the form, the list is unchanged, and the typed text is kept.
- Given a successful add after an error, then the error message is cleared.

**M3. Titles render as text (security)**
As a user, I want titles shown as plain text so that a malicious title cannot run script.
- Given a todo titled `<img src=x onerror=alert(1)>`, when the page renders the list, then the literal text is shown and no element or script is injected.
- Given the page code, then titles are set with `textContent` (or an equivalent safe method), not `innerHTML`, for both the initial load and newly added todos.

### Should
- S1. The input has `maxlength=120` and a label or placeholder, and the Add button is disabled while a request is in flight.

### Could
- C1. Show a character counter near the input.

### Won't (this release)
Edit, delete, toggle done, persistence.

## 6. Success metrics
- All M1 to M3 acceptance criteria pass in `npm test` (API tests via `server.listen(0)` and fetch, plus a check that the page uses no `innerHTML` for titles).
- Manual check: adding a todo from the page takes one action and no reload, and the XSS payload title renders as text.
- Zero uncaught exceptions on invalid input (the server stays up after each 400 case).

## 7. Open questions
None. All decisions are recorded in section 4.
