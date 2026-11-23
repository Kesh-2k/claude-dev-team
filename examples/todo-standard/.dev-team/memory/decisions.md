# Decisions (newest first)
- 2026-11-22 - Validation + in-memory store live in pure module `src/todos.js` (validateTitle/listTodos/addTodo/resetTodos) - unit-testable, server never touches the array.
- 2026-11-22 - POST body limit 1 KB -> 413 (wrong Content-Type -> 415, all content errors -> 400 `{error}`) - distinct, standard codes; max valid title escaped is ~732 B.
- 2026-11-22 - Stay zero-dependency: hand-written readBody/sendJson, exact-match routing kept - app is tiny, no framework justified.
